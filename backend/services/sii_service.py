"""
Servicio de integración con el SII (Servicio de Impuestos Internos de Chile).

Flujo de autenticación:
  1. getSemilla()  → obtiene semilla temporal del SII
  2. Firmar semilla con certificado digital (firma electrónica)
  3. getToken()    → intercambia semilla firmada por token de sesión
  4. Usar token para verificar DTEs con getEstDte()

Importación de DTEs:
  - Los proveedores envían el archivo XML del DTE por correo o el SII lo reenvía.
  - Se puede subir el XML directamente y se parsea para extraer los ítems de compra.
"""

import logging
import os
from typing import Optional
import requests
from lxml import etree

logger = logging.getLogger(__name__)

SII_TOKEN_URL = "https://palena.sii.cl/DTEWS/GetTokenFromSeed.jws"
SII_DTE_URL = "https://palena.sii.cl/DTEWS/QueryEstDte.jws"
SII_NS = "http://www.sii.cl/SiiDte"

TIPOS_DTE = {
    33: "Factura Electrónica",
    34: "Factura No Afecta/Exenta",
    39: "Boleta Electrónica",
    41: "Boleta No Afecta/Exenta",
    46: "Liquidación Factura",
    52: "Guía de Despacho",
    56: "Nota de Débito",
    61: "Nota de Crédito Electrónica",
}

ESTADOS_DTE = {
    "00": "Documento aceptado sin reparos",
    "01": "Documento no existe",
    "02": "Documento no pertenece al receptor",
    "03": "Fecha de emisión no corresponde",
    "04": "Monto total no corresponde",
    "05": "Firma no válida",
    "06": "RUT del receptor no válido",
    "07": "Error en datos del documento",
}


class SIIService:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (compatible; CasonaInventario/1.0)"
        })

    # ─── Autenticación ───────────────────────────────────────────────────────

    def get_seed(self) -> Optional[str]:
        """Obtiene semilla de autenticación desde el SII (sin credenciales)."""
        soap = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">'
            "<soapenv:Body><getSemilla/></soapenv:Body>"
            "</soapenv:Envelope>"
        )
        try:
            resp = self.session.post(
                SII_TOKEN_URL,
                data=soap.encode("utf-8"),
                headers={"Content-Type": "text/xml;charset=UTF-8", "SOAPAction": ""},
                timeout=30,
            )
            resp.raise_for_status()
            root = etree.fromstring(resp.content)
            semilla = root.find(".//{*}SEMILLA")
            if semilla is None:
                semilla = root.find(".//{*}Semilla")
            if semilla is not None and semilla.text:
                return semilla.text.strip()
            logger.warning(f"Semilla no encontrada. Respuesta SII: {resp.text[:400]}")
        except Exception as exc:
            logger.error(f"Error obteniendo semilla SII: {exc}")
        return None

    def get_token_with_cert(self, cert_pem_path: str, key_pem_path: str) -> Optional[str]:
        """
        Obtiene token SII firmando la semilla con el certificado digital.
        Requiere signxml: pip install signxml
        """
        try:
            from signxml import XMLSigner, methods as sign_methods  # type: ignore

            seed = self.get_seed()
            if not seed:
                return None

            seed_xml_str = f"<getToken><item><Semilla>{seed}</Semilla></item></getToken>"
            seed_root = etree.fromstring(seed_xml_str.encode())

            with open(cert_pem_path, "rb") as f:
                cert_pem = f.read()
            with open(key_pem_path, "rb") as f:
                key_pem = f.read()

            signer = XMLSigner(method=sign_methods.enveloped)
            signed_root = signer.sign(seed_root, key=key_pem, cert=cert_pem)
            signed_xml = etree.tostring(signed_root, encoding="unicode")

            return self._exchange_seed_for_token(signed_xml)
        except ImportError:
            logger.error("signxml no instalado. Ejecutar: pip install signxml")
        except Exception as exc:
            logger.error(f"Error obteniendo token con certificado: {exc}")
        return None

    def _exchange_seed_for_token(self, signed_xml: str) -> Optional[str]:
        """Intercambia la semilla firmada por un token SII."""
        soap = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">'
            "<soapenv:Body>"
            f"<getToken><pszXml><![CDATA[{signed_xml}]]></pszXml></getToken>"
            "</soapenv:Body></soapenv:Envelope>"
        )
        try:
            resp = self.session.post(
                SII_TOKEN_URL,
                data=soap.encode("utf-8"),
                headers={"Content-Type": "text/xml;charset=UTF-8", "SOAPAction": ""},
                timeout=30,
            )
            resp.raise_for_status()
            root = etree.fromstring(resp.content)
            token_elem = root.find(".//{*}TOKEN")
            if token_elem is None:
                token_elem = root.find(".//{*}Token")
            if token_elem is not None and token_elem.text:
                return token_elem.text.strip()
            estado = root.find(".//{*}ESTADO")
            logger.error(f"Token SII no obtenido. Estado: {estado.text if estado is not None else '?'}")
        except Exception as exc:
            logger.error(f"Error intercambiando semilla por token: {exc}")
        return None

    # ─── Verificación de DTE ─────────────────────────────────────────────────

    def verificar_dte(
        self,
        token: str,
        rut_emisor: str,
        dv_emisor: str,
        rut_receptor: str,
        dv_receptor: str,
        tipo_dte: int,
        folio: int,
        fecha: str,       # formato DD/MM/YYYY
        monto: int,
    ) -> dict:
        """
        Consulta el estado de un DTE en el SII usando getEstDte.
        Retorna dict con {verificado, estado_codigo, estado_glosa, ...}
        """
        soap = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">'
            "<soapenv:Body><getEstDte>"
            f"<RutEmisor>{rut_emisor}</RutEmisor>"
            f"<DvEmisor>{dv_emisor}</DvEmisor>"
            f"<RutReceptor>{rut_receptor}</RutReceptor>"
            f"<DvReceptor>{dv_receptor}</DvReceptor>"
            f"<TipoDte>{tipo_dte}</TipoDte>"
            f"<FolioDte>{folio}</FolioDte>"
            f"<FechaEmisionDte>{fecha}</FechaEmisionDte>"
            f"<MontoDte>{monto}</MontoDte>"
            f"<Token>{token}</Token>"
            "</getEstDte></soapenv:Body></soapenv:Envelope>"
        )
        try:
            resp = self.session.post(
                SII_DTE_URL,
                data=soap.encode("utf-8"),
                headers={"Content-Type": "text/xml;charset=UTF-8", "SOAPAction": ""},
                timeout=30,
            )
            resp.raise_for_status()
            root = etree.fromstring(resp.content)

            estado = root.find(".//{*}ESTADO")
            glosa = root.find(".//{*}GLOSA")
            estado_val = (estado.text or "").strip() if estado is not None else "ERR"
            glosa_val = (glosa.text or "").strip() if glosa is not None else "Sin respuesta del SII"

            return {
                "verificado": estado_val == "00",
                "estado_codigo": estado_val,
                "estado_glosa": ESTADOS_DTE.get(estado_val, glosa_val),
                "folio": folio,
                "tipo_dte": tipo_dte,
                "tipo_nombre": TIPOS_DTE.get(tipo_dte, f"DTE tipo {tipo_dte}"),
            }
        except Exception as exc:
            logger.error(f"Error verificando DTE {folio}: {exc}")
            return {
                "verificado": False,
                "estado_codigo": "ERROR",
                "estado_glosa": f"Error de conexión con SII: {exc}",
                "folio": folio,
                "tipo_dte": tipo_dte,
                "tipo_nombre": TIPOS_DTE.get(tipo_dte, ""),
            }

    # ─── Parseo de XML DTE ───────────────────────────────────────────────────

    def parse_dte_xml(self, xml_content: bytes) -> Optional[dict]:
        """
        Parsea el archivo XML de un DTE enviado por el proveedor.
        Soporta el namespace estándar del SII: http://www.sii.cl/SiiDte
        Retorna dict con todos los datos de la compra listos para ingresar.
        """
        try:
            root = etree.fromstring(xml_content)

            def find_text(node, *tags) -> str:
                for tag in tags:
                    for prefix in (f"{{{SII_NS}}}", ""):
                        elem = node.find(f".//{prefix}{tag}")
                        if elem is not None and elem.text:
                            return elem.text.strip()
                return ""

            # El DTE puede venir envuelto en EnvioDTE o directo
            doc = (
                root.find(f".//{{{SII_NS}}}Documento")
                or root.find(".//Documento")
            )
            if doc is None:
                logger.error("XML no contiene elemento <Documento>")
                return None

            tipo_dte = int(find_text(doc, "TipoDTE") or "33")
            folio = find_text(doc, "Folio")
            fecha = find_text(doc, "FchEmis")          # YYYY-MM-DD
            rut_emisor_full = find_text(doc, "RUTEmisor")
            nombre_emisor = find_text(doc, "RznSoc")
            monto_neto = float(find_text(doc, "MntNeto") or "0")
            iva = float(find_text(doc, "IVA") or "0")
            monto_total = float(find_text(doc, "MntTotal") or "0")

            # Parsear RUT (76123456-7) → número sin puntos
            rut_num = rut_emisor_full.split("-")[0].replace(".", "") if rut_emisor_full else ""

            # Detalles (ítems)
            detalles_elems = doc.findall(f".//{{{SII_NS}}}Detalle")
            if not detalles_elems:
                detalles_elems = doc.findall(".//Detalle")

            items = []
            for det in detalles_elems:
                def get(tag):
                    for prefix in (f"{{{SII_NS}}}", ""):
                        e = det.find(f"{prefix}{tag}")
                        if e is not None and e.text:
                            return e.text.strip()
                    return ""

                nombre = get("NmbItem")
                qty_str = get("QtyItem") or "1"
                unidad = get("UnmdItem") or "unidad"
                precio_str = get("PrcItem") or "0"
                monto_str = get("MontoItem") or "0"

                qty = float(qty_str.replace(",", "."))
                precio = float(precio_str.replace(",", "."))
                monto_item = float(monto_str.replace(",", ".")) or round(qty * precio, 2)

                items.append({
                    "descripcion": nombre,
                    "cantidad": qty,
                    "unidad": unidad.lower(),
                    "precio_unitario": precio,
                    "monto_item": monto_item,
                    "ingrediente_id": None,
                })

            return {
                "folio_sii": folio,
                "tipo_dte": tipo_dte,
                "tipo_nombre": TIPOS_DTE.get(tipo_dte, f"DTE {tipo_dte}"),
                "rut_proveedor": rut_num,
                "dv_proveedor": rut_emisor_full.split("-")[-1] if "-" in rut_emisor_full else "",
                "nombre_proveedor": nombre_emisor,
                "fecha": fecha,
                "monto_neto": monto_neto,
                "iva": iva,
                "monto_total": monto_total,
                "items": items,
            }
        except Exception as exc:
            logger.error(f"Error parseando XML DTE: {exc}")
            return None


sii_service = SIIService()

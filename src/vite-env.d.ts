/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL de base du serveur SOMEI (ex: https://somei.seaco.local/rec). Sert de valeur par défaut. */
  readonly VITE_SOAP_BASE_URL?: string;
  /** URL explicite du WSDL SOAP. Si absente, déduite de VITE_SOAP_BASE_URL + /WSAcces.asmx?wsdl */
  readonly VITE_SOAP_WSDL_URL?: string;
  /** Client ID SOMEI par défaut (optionnel, surchargé par l'écran Profil) */
  readonly VITE_SOAP_CLIENT_ID?: string;
  /** Access Key SOMEI par défaut (optionnel, surchargé par l'écran Profil) */
  readonly VITE_SOAP_ACCESS_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

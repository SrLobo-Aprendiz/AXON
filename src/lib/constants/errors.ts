export const ERROR_CODES = {
  SHOPPING_LIST: {
    DUPLICATE_ITEM: 'ERR_SHOP_01',
    SAVE_FAILED: 'ERR_SHOP_02',
    DELETE_FAILED: 'ERR_SHOP_03'
  },
  INVENTORY: {
    MOVE_FAILED: 'ERR_INV_01'
  }
} as const;

export const ERROR_MESSAGES: Record<string, { title: string, description: string }> = {
  [ERROR_CODES.SHOPPING_LIST.DUPLICATE_ITEM]: {
    title: "Aviso",
    description: "Este producto ya está apuntado en tu lista de la compra."
  },
  [ERROR_CODES.SHOPPING_LIST.SAVE_FAILED]: {
    title: "Error",
    description: "No se pudo guardar la información de la compra."
  },
  [ERROR_CODES.SHOPPING_LIST.DELETE_FAILED]: {
    title: "Error",
    description: "No se pudo borrar el producto de la lista."
  },
  [ERROR_CODES.INVENTORY.MOVE_FAILED]: {
    title: "Error de inventario",
    description: "Hubo un problema al mover el stock."
  }
};

/**
 * Función centralizada para obtener el contenido humano de los errores.
 * Esto facilitará en el futuro la inyección de librerías como i18next para
 * multi-idioma.
 */
export const getErrorContent = (code: string, fallbackMessage?: string) => {
    return ERROR_MESSAGES[code] || { 
        title: "Error Interno", 
        description: fallbackMessage || code || "Ha ocurrido un error inesperado." 
    };
};

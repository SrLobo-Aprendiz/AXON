import { describe, it, expect } from 'vitest';
import { calculateAutomation } from '../lib/services/automation';
import { ProductDefinition } from '../lib/types';

describe('calculateAutomation', () => {
  const today = new Date('2024-03-20');

  const mockProducts: ProductDefinition[] = [
    {
      id: 'p1',
      name: 'Leche',
      category: 'Dairy',
      unit: 'uds',
      importance_level: 'critical',
      min_quantity: 2,
      is_ghost: false,
      household_id: 'h1',
      created_at: ''
    },
    {
      id: 'p2',
      name: 'Arroz',
      category: 'Pantry',
      unit: 'uds',
      importance_level: 'high',
      min_quantity: 1,
      is_ghost: false,
      household_id: 'h1',
      created_at: ''
    }
  ];

  it('debe añadir a la lista si un producto crítico tiene stock 0', () => {
    const inventory: any[] = []; // Sin stock
    const shoppingListMap = new Map();
    const receptionMap = new Map();

    const result = calculateAutomation(inventory, mockProducts, shoppingListMap, receptionMap, today);

    expect(result.counters.critical).toBe(1);
    expect(result.toUpsert).toContainEqual(expect.objectContaining({
      item_name: 'Leche',
      priority: 'panic'
    }));
  });

  it('debe contar como stock 0 si el lote está caducado (<= 3 días)', () => {
    const inventory = [
      {
        product: mockProducts[0],
        quantity: 10,
        expiry_date: '2024-03-21', // Solo queda 1 día
        is_ghost: false
      }
    ];
    const shoppingListMap = new Map();
    const receptionMap = new Map();

    const result = calculateAutomation(inventory, mockProducts, shoppingListMap, receptionMap, today);

    expect(result.productStats.get('leche')?.effectiveQty).toBe(0);
    expect(result.counters.critical).toBe(1);
    expect(result.toUpsert.filter(i => i.item_name === 'Leche').length).toBe(1);
  });

  it('no debe añadir a la lista si el stock es suficiente', () => {
    const products = [mockProducts[0]];
    const inventory = [
      {
        product: products[0],
        quantity: 5,
        expiry_date: '2024-04-20',
        is_ghost: false
      }
    ];
    const shoppingListMap = new Map();
    const receptionMap = new Map();

    const result = calculateAutomation(inventory, products, shoppingListMap, receptionMap, today);

    expect(result.counters.critical).toBe(0);
    expect(result.toUpsert.length).toBe(0);
  });

  it('debe sugerir borrado si hay stock suficiente y el item no es manual', () => {
    const products = [mockProducts[0]];
    const inventory = [
      {
        product: products[0],
        quantity: 5,
        expiry_date: '2024-04-20',
        is_ghost: false
      }
    ];
    const shoppingListMap = new Map([
      ['leche', { id: 'list_1', is_manual: false }]
    ]);
    const receptionMap = new Map();

    const result = calculateAutomation(inventory, products, shoppingListMap, receptionMap, today);

    expect(result.toDelete).toContain('list_1');
    expect(result.toUpsert.length).toBe(0);
  });

  it('NO debe borrar de la lista si el item fue añadido manualmente', () => {
    const products = [mockProducts[0]];
    const inventory = [
      {
        product: products[0],
        quantity: 5,
        expiry_date: '2024-04-20',
        is_ghost: false
      }
    ];
    const shoppingListMap = new Map([
      ['leche', { id: 'list_1', is_manual: true }]
    ]);
    const receptionMap = new Map();

    const result = calculateAutomation(inventory, products, shoppingListMap, receptionMap, today);

    expect(result.toDelete.length).toBe(0);
  });

  it('NO debe borrar si el stock es suficiente PERO el item es manual (Respeto al Humano)', () => {
    const products = [mockProducts[0]]; // Leche (min 2)
    const inventory = [
      {
        product: products[0],
        quantity: 10, // Stock de sobra
        expiry_date: '2025-01-01',
        is_ghost: false
      }
    ];
    const shoppingListMap = new Map([
      ['leche', { id: 'manual_row_1', is_manual: true }]
    ]);
    const receptionMap = new Map();

    const result = calculateAutomation(inventory, products, shoppingListMap, receptionMap, today);

    expect(result.toDelete).not.toContain('manual_row_1');
    expect(result.toDelete.length).toBe(0);
  });
});

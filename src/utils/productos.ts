import { Comercio } from '../tipos';

export function obtenerTagsProductos(comercio: Comercio): string[] {
    const tagsPorRubro: Record<string, string[]> = {
        'rub-gastronomia': ['queso', 'fiambres', 'panificados', 'cafetería', 'minutas', 'bebidas', 'pastas', 'empanadas'],
        'rub-indumentaria': ['ropa', 'calzado', 'accesorios', 'temporada', 'jeans', 'remeras', 'camperas'],
        'rub-hogar': ['decoración', 'bazar', 'muebles', 'blanquería', 'iluminación', 'electrodomésticos'],
        'rub-ferreteria': ['herramientas', 'pintura', 'tornillos', 'electricidad', 'plomería', 'cerrajería', 'construcción'],
        'rub-salud': ['farmacia', 'perfumería', 'cuidado personal', 'óptica', 'suplementos'],
        'rub-tecnologia': ['celulares', 'accesorios', 'computación', 'servicio técnico', 'cables', 'audio'],
        'rub-servicios': ['asesoramiento', 'mantenimiento', 'turnos', 'atención personalizada'],
    };

    const base = tagsPorRubro[comercio.rubroId] ?? ['atención local', 'productos seleccionados'];
    const palabrasDesc = (comercio.descripcion || '')
        .toLowerCase()
        .replace(/[.,;:()]/g, '')
        .split(/\s+/)
        .filter((p) => p.length > 4 && !['desde', 'todos', 'nuestros', 'local', 'venta'].includes(p))
        .slice(0, 3);

    return Array.from(new Set([...base, ...palabrasDesc]));
}
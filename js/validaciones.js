function esSedeValida(sede) {
    return Boolean(sede &&
        typeof sede.nombre === 'string' && sede.nombre.trim() &&
        typeof sede.direccion === 'string' && sede.direccion.trim());
}
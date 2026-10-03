function esSedeValida(sede) {
    if (!sede) return false;
    if (typeof sede.nombre !== 'string' || !sede.nombre.trim()) return false;
    if (typeof sede.direccion !== 'string' || !sede.direccion.trim()) return false;
    return true;
}
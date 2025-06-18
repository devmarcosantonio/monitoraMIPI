export function getBrasiliaDate() {
    // Horário de Brasília (GMT-3)
    const now = new Date();
    // Obtém o offset do fuso horário local em minutos
    const localOffset = now.getTimezoneOffset();
    // Offset de Brasília em minutos (-3 horas)
    const brasiliaOffset = 180;
    // Calcula a diferença entre o local e Brasília
    const diff = localOffset - brasiliaOffset;
    // Cria o Date ajustado para Brasília
    return new Date(now.getTime() + diff * 60000);
}

export default getBrasiliaDate;
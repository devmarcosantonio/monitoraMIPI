import TelegramBot from 'node-telegram-bot-api';
import { differenceInMinutes, parse } from 'date-fns';
import Automate from "./Automacao.js";
import dotenv from 'dotenv';
import getBrasiliaDate from './horario.js';

dotenv.config();

const telegramToken = process.env.TELEGRAM_TOKEN;

const bot = new TelegramBot(telegramToken, { polling: true });

const chatId = process.env.TELEGRAM_CHAT_ID;

const url = process.env.MIPI_URL;
const username = process.env.MIPI_USER;
const password = process.env.MIPI_PASS;


const automate = new Automate();

// Captura erros do bot e tenta reiniciar polling
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
    setTimeout(() => {
        bot.stopPolling()
            .then(() => bot.startPolling())
            .catch(err => console.error('Erro ao reiniciar polling:', err));
    }, 5000); // tenta reiniciar após 5 segundos
});

// Captura erros não tratados e tenta reiniciar a tarefa
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    setTimeout(() => {
        executarTarefa();
    }, 5000); // tenta reiniciar após 5 segundos
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
    setTimeout(() => {
        executarTarefa();
    }, 5000); // tenta reiniciar após 5 segundos
});


async function executarTarefa() {
    let tentativas = 0;
    let sucesso = false;
    let horario_ultima_carga_mipi = '';
    let erroLogin = false;
    await bot.sendMessage(chatId, '🔎 Hora de monitorar! Vou acessar o MIPI...', { parse_mode: 'HTML' });
    while (tentativas < 4 && !sucesso) {
        // Envia mensagem antes de tentar login
       

        try {
            await automate.init();
            await automate.login(url, username, password);

            horario_ultima_carga_mipi = await automate.readLastTime();
            await automate.close();
            sucesso = true;
        } catch (err) {
            tentativas++;
            await automate.close();

            if (tentativas < 4) {
                await bot.sendMessage(chatId, `❌ Ops, erro de login, tentando novamente. Tentativa: ${tentativas + 1}...`, { parse_mode: 'HTML' });
            }
            if (tentativas >= 4) {
                erroLogin = true;
            }
        }
    }

    if (erroLogin) {
        const mensagemErro =
            '❌ Tentei entrar no MIPI 4x e não consegui.\n' +
            'Verifique se o MIPI ainda está no ar ou se há algum problema de acesso.';
        await bot.sendMessage(chatId, mensagemErro, { parse_mode: 'HTML' });
        return;
    }

    // const horario_atual = new Date();
    const horario_atual = getBrasiliaDate()
    const horario_carga = parse(horario_ultima_carga_mipi, 'dd/MM/yyyy HH:mm:ss', new Date());
    const diferenca = differenceInMinutes(horario_atual, horario_carga);

    const statusMsg =
        diferenca >= 30
            ? '🟥 <b>Alerta:</b> A última carga foi registrada há mais de <b>30 minutos</b>!'
            : diferenca >= 15
                ? '⚠️ <b>Atenção:</b> A última carga foi registrada há mais de <b>15 minutos</b>!'
                : '✅ <b>Tudo certo!</b> A última carga foi registrada recentemente.';

    const mensagem =
        `🚦 <b>Status do Monitoramento MIPI</b>\n\n` +
        `📅 <b>Última carga registrada:</b>\n<code>${horario_ultima_carga_mipi}</code>\n\n` +
        `⏰ <b>Horário atual:</b>\n<code>${horario_atual.toLocaleString()}</code>\n\n` +
        `🕒 <b>Diferença em minutos:</b>\n<code>${diferenca}</code>\n\n` +
        statusMsg;

    await bot.sendMessage(chatId, mensagem, { parse_mode: 'HTML' });
}

// Executa a tarefa imediatamente ao iniciar
executarTarefa();

// Agenda a execução da tarefa a cada 20 minutos (1200000 ms)
setInterval(executarTarefa, 20 * 60 * 1000); // 20 minutos em milissegundos
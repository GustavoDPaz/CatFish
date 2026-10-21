import cron from 'node-cron';
import { OpenFinanceService } from './openFinance.js';

let cronTask: cron.ScheduledTask | null = null;

export function startBackgroundSyncWorker() {
  console.log('[SyncWorker] Inicializando Background Worker de sincronização Open Finance (intervalo: 60 minutos)...');

  // Runs every 60 minutes at minute 0: '0 * * * *'
  cronTask = cron.schedule('0 * * * *', async () => {
    const timestamp = new Date().toISOString();
    console.log(`[SyncWorker][${timestamp}] Executando sincronização horária automática de bancos e faturas...`);
    try {
      const result = await OpenFinanceService.syncAllActiveConnections();
      console.log(`[SyncWorker][${timestamp}] Conexões sincronizadas com sucesso: ${result.syncedCount}`);
    } catch (error) {
      console.error(`[SyncWorker][${timestamp}] Erro durante sincronização horária de contas:`, error);
    }
  });

  console.log('[SyncWorker] Background Worker agendado com sucesso.');
}

export function stopBackgroundSyncWorker() {
  if (cronTask) {
    cronTask.stop();
    console.log('[SyncWorker] Background Worker finalizado com sucesso.');
  }
}

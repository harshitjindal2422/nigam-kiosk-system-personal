import { Server } from 'socket.io';
import { logger } from './config/logger.js';
import { prisma } from './config/db.js';

let io;

export function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info(`🔌 Client connected to Socket.IO: ${socket.id}`);

    // Fetch the current queue (tokens with WAITING status)
    socket.on('fetchQueue', async () => {
      try {
        const queue = await prisma.token.findMany({
          where: { queue_status: 'WAITING' },
          orderBy: { issued_at: 'asc' },
        });
        const currentTokenRecord = await prisma.token.findFirst({
          where: { queue_status: 'SERVING' },
          orderBy: { issued_at: 'desc' },
        });
        const current = currentTokenRecord ? currentTokenRecord.token_number : '---';
        
        socket.emit('queueUpdated', { queue: queue.map(t => t.token_number), current });
      } catch (error) {
        logger.error('Error fetching queue for socket', error);
      }
    });

    socket.on('callNext', async () => {
      try {
        // Mark current 'SERVING' as 'COMPLETED'
        await prisma.token.updateMany({
          where: { queue_status: 'SERVING' },
          data: { queue_status: 'COMPLETED' },
        });

        // Get the next waiting token
        const nextToken = await prisma.token.findFirst({
          where: { queue_status: 'WAITING' },
          orderBy: { issued_at: 'asc' },
        });

        if (nextToken) {
          // Mark it as serving
          await prisma.token.update({
            where: { token_id: nextToken.token_id },
            data: { queue_status: 'SERVING' },
          });
        }
        
        // Broadcast update to all clients to refetch queue
        io.emit('queueChangeBroadcast');
      } catch (error) {
        logger.error('Error calling next token', error);
      }
    });

    socket.on('announceToken', (tokenStr) => {
      // Broadcast to everyone to play the announcement
      io.emit('playAnnouncement', tokenStr);
    });
    
    socket.on('resetQueue', async () => {
      try {
        // Mark all active tokens as completed to reset queue
        await prisma.token.updateMany({
          where: { queue_status: { in: ['WAITING', 'SERVING'] } },
          data: { queue_status: 'COMPLETED' },
        });
        io.emit('queueChangeBroadcast');
      } catch (error) {
        logger.error('Error resetting queue', error);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`🔌 Client disconnected from Socket.IO: ${socket.id}`);
    });
  });

  return io;
}

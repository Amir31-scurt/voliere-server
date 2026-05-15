/**
 * Gestion des connexions Socket.IO
 * Les controllers émettent des events via : req.app.get('io').emit(...)
 */
export const initCageSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connecté : ${socket.id}`);

    // Le client peut rejoindre une "room" par volière pour des updates ciblées
    socket.on('join:voliere', (voliere) => {
      socket.join(voliere);
      console.log(`📡 ${socket.id} a rejoint la room : ${voliere}`);
    });

    socket.on('leave:voliere', (voliere) => {
      socket.leave(voliere);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client déconnecté : ${socket.id}`);
    });
  });
};

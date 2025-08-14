import { createSignal, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { trpc } from '~/lib/core/trpc';
import { v4 as uuidv4 } from 'uuid';

export default function Lobby() {
  const [showJoinModal, setShowJoinModal] = createSignal(false);
  const [roomCode, setRoomCode] = createSignal('');
  const navigate = useNavigate();

  onMount(() => {});

  const handleNewRoom = async () => {
    const creatorName = uuidv4().slice(0, 8);
    const res = await trpc.game.createRoom.mutate({ creatorName });

    if (!res.success) return console.error('Failed to create room');

    const { roomId } = res.data;
    navigate(`/room/${roomId}`);
  };

  const handleJoinRoom = () => {
    if (roomCode().trim()) {
      // TODO: Implement join room logic
      console.log('Joining room:', roomCode());
      setShowJoinModal(false);
      navigate(`/room/${roomCode()}`);
      setRoomCode('');
    }
  };

  const handleJoinModalOpen = () => {
    setShowJoinModal(true);
  };

  const handleJoinModalClose = () => {
    setShowJoinModal(false);
    setRoomCode('');
  };

  return (
    <div class="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-amber-900 flex items-center justify-center p-4">
      {/* Main Content */}
      <div class="relative z-10 w-full max-w-md mx-auto">
        {/* Header */}
        <div class="text-center mb-12">
          <h1 class="text-5xl font-bold text-amber-100 mb-2 tracking-wide">赖赖象棋</h1>
          <h2 class="text-2xl font-semibold text-red-200 mb-1">Chinese Chess</h2>
          <p class="text-red-300 text-sm opacity-80">
            {/*Challenge friends in the ancient game of strategy*/}
          </p>
        </div>

        {/* Action Buttons Container */}
        <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20">
          <div class="space-y-4">
            {/* New Room Button */}
            <button
              onClick={handleNewRoom}
              class="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 flex items-center justify-center space-x-3"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span class="text-lg">Create New Room</span>
            </button>

            {/* Join Room Button */}
            <button
              onClick={handleJoinModalOpen}
              class="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 flex items-center justify-center space-x-3"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
              <span class="text-lg">Join Room</span>
            </button>
          </div>

          {/* Divider */}
          <div class="my-6 border-t border-white/20"></div>

          {/* Statistics or Info */}
          <div class="text-center text-red-200 text-sm space-y-1">
            <p class="opacity-80">Quick games • Real-time play</p>
          </div>
        </div>

        {/* Footer */}
        <div class="text-center mt-8 text-red-300 text-xs opacity-60">
          <p>© 2025 Chinese Chess Online</p>
        </div>
      </div>

      {/* Join Room Modal */}
      {showJoinModal() && (
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl transform scale-100 transition-transform">
            <h3 class="text-xl font-semibold text-gray-800 mb-4 text-center">Join Room</h3>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Room Code</label>
                <input
                  type="text"
                  value={roomCode()}
                  onInput={(e) => setRoomCode(e.currentTarget.value)}
                  placeholder="Enter room code..."
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-colors text-center text-lg font-mono tracking-widest uppercase"
                  maxLength={6}
                />
              </div>

              <div class="flex space-x-3 pt-2">
                <button
                  onClick={handleJoinModalClose}
                  class="flex-1 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinRoom}
                  disabled={!roomCode().trim()}
                  class="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

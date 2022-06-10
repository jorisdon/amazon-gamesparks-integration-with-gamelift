jest.useFakeTimers();
const path = require('path');
const gameloop = require('../gameloop'); // import the implementation that this test suite covers

const gameloop_id_cleanups = [];

test('sets up a game loop', () => {
    const fn = jest.fn((delta) => {});
    const id = gameloop.setGameLoop(fn, 10);
    gameloop_id_cleanups.push(id);
    expect(id).toEqual(expect.any(Number));
    expect(fn).toHaveBeenCalledTimes(1);

    fn.mockClear(); // reset state
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(8);
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(10);
    expect(fn).toHaveBeenCalledWith(expect.closeTo(0.01, 5));

    fn.mockClear(); // reset state
    jest.advanceTimersByTime(2); // 21ms total, so we can expect another tick now
    expect(fn).toHaveBeenCalledWith(expect.closeTo(0.01, 5));
});

afterEach(() => {
    while (gameloop_id_cleanups.length > 0) {
        gameloop.clearGameLoop(gameloop_id_cleanups.pop());
    }
})

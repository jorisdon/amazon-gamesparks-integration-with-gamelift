// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

let nextLoopId = 0;
const loopMap = new Map(); // map from loopId to timeout symbol

function getTime() {
	const time = process.hrtime();
	return ((time[0] * 1e9) + time[1]) * 1e-6;
}

module.exports.setGameLoop = function(callbackFn, ticksInMs) {
	let prevTime = getTime(); 
	const wrappedCallback = () => {
		const newTime = getTime();
		const timeTaken = (newTime - prevTime) / 1000;
		prevTime = newTime;
		callbackFn(timeTaken);
	};

	const intervalRef = setInterval(wrappedCallback, Math.floor(ticksInMs));
	// call immediately!
	wrappedCallback();

	const externalReferenceId = nextLoopId;
	loopMap.set(externalReferenceId, intervalRef);
	nextLoopId += 1;

	return externalReferenceId;
};

module.exports.clearGameLoop = function(loopId) {
	const timeoutRef = loopMap.get(loopId);
	if (timeoutRef !== undefined) {
		clearInterval(timeoutRef);
	}
};
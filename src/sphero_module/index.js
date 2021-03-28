"use strict"
const Leap = require('leapjs');
const Scanner = require('spherov2.js').Scanner;

const WAIT_TIME = 100;
let spheroBall;
let controller;
let waitIntervalForNextCommandId;
let isStopped = true;
let calibrating = false;
let headingOffset = 0;

const maxSpeed = 150;
const minLeft = 0.2;
const minRight = -0.2;
const minToward = -0.15;
const minBackward = 0.2;

const maxLimit = 1;

function getAngle(x, y) {
    return Math.acos(-y / Math.sqrt(Math.pow(x,2)+Math.pow(y, 2))) * 180 / Math.PI * (x <= 0 ? 1 : -1) + (x <= 0 ? 0 : 360);
}

const spheroModule = () => {
    initConnections();
}

const initConnections = async () => {
    console.log("Waiting for Sphero connection...");
    spheroBall = await Scanner.findSpheroMini();
    if (!spheroBall) return console.log('sphero mini not available!');
    console.log('Connected to Sphero');
    spheroBall.setMainLedColor(0xff, 0, 0);
    initLeapMotionConnection();
}

const initLeapMotionConnection = () => {
    controller = Leap.loop({ frameEventName: 'deviceFrame', enableGestures: true });
    console.log('waiting for Leap Motion connection...');

    controller.connect();

    controller.on('connect', () => {
        console.log('connected to leap motion');
    });
    controller.on('ready', () => {
        console.log('ready');
    });
    controller.on('deviceStreaming', () => {
        console.log('device connected');
    });
    controller.on('deviceStopped', () => {
        console.log('device disconnected');
    });
    controller.on('frame', frame => {
        const handsKeys = Object.keys(frame.handsMap);
        if (handsKeys[0]) {
            handleSwipe(frame.handsMap[handsKeys[0]]);
        } else {
            console.log('No hands');
            stopSphero(spheroBall);
        };
    });
}

const handleSwipe = hand => {
    const newCalibrating = hand.fingers[1].extended && !hand.fingers[0].extended && !hand.fingers[2].extended && !hand.fingers[3].extended && !hand.fingers[4].extended;
    if (calibrating !== newCalibrating) {
        if (newCalibrating) {
            spheroBall.setBackLedIntensity(255);
            spheroBall.setMainLedColor(0, 0, 0);
        } else {
            spheroBall.setBackLedIntensity(0);
            spheroBall.setMainLedColor(0xff, 0, 0);
        }
    }
    calibrating = newCalibrating;
    if (calibrating) {
        if (!waitIntervalForNextCommandId) {
            calibrateSphero(hand.fingers[1].direction[0]);
            waitIntervalForNextCommandId = setTimeout(() => {
                clearTimeout(waitIntervalForNextCommandId);
                waitIntervalForNextCommandId = null;
            }, WAIT_TIME);
        }
        return;
    }
    let towardsBackwards = hand.pitch();
    let leftRight = hand.roll();
    let previousFrame = controller.frame(1);
    const towardsBackwardsDeltaCalibration = 0;
    const leftRightDeltaCalibration = +0.15;
    towardsBackwards += towardsBackwardsDeltaCalibration;
    leftRight += leftRightDeltaCalibration;

    let towardsBackwardsSpeed = 0;
    let leftRightSpeed = 0;
    if (towardsBackwards > minBackward) {
    towardsBackwardsSpeed = maxSpeed * (Math.min(maxLimit, towardsBackwards) - minBackward) / (maxLimit - minBackward);
    } else if (towardsBackwards < minToward) {
    towardsBackwardsSpeed = maxSpeed * (Math.max(-maxLimit, towardsBackwards) - minToward) / (maxLimit + minToward);
    }
    if (leftRight > minLeft) {
    leftRightSpeed = maxSpeed * (Math.min(maxLimit, leftRight) - minLeft) / (maxLimit - minLeft);
    } else if (leftRight < minRight) {
    leftRightSpeed = maxSpeed * (Math.max(-maxLimit, leftRight) - minRight) / (maxLimit + minRight);
    }

    const newSpeed = Math.sqrt(Math.pow(towardsBackwardsSpeed, 2) + Math.pow(leftRightSpeed, 2));
    const newDirection = getAngle(leftRightSpeed, towardsBackwardsSpeed);
    
    if (!waitIntervalForNextCommandId) {
        moveSphero(newDirection, newSpeed);
        waitIntervalForNextCommandId = setTimeout(() => {
            clearTimeout(waitIntervalForNextCommandId);
            waitIntervalForNextCommandId = null;
        }, WAIT_TIME);
    }
}

const moveSphero = (direction, speed) => {
    console.log(direction, speed);
    isStopped = false;
    if (speed !== 0 && !speed) {
      speed = 70;
    } else if (speed === 0 && !calibrating) {
        return stopSphero(spheroBall)
    }
    spheroBall.roll(speed, (direction + headingOffset) % 360, []);
}

const calibrateSphero = (direction) => {
    if (Math.abs(direction) > 0.2) {
        headingOffset += direction * 10;
        if (headingOffset < 0) {
            headingOffset += 360;
        } else if (headingOffset >= 360) {
            headingOffset -= 360;
        }
        console.log(headingOffset);
        spheroBall.roll(0, headingOffset, []);
    }
}

const stopSphero = spheroBall => {
    if (isStopped) {
        return;
    }
    console.log('Stop sphero');
    isStopped = true;
    calibrating = false;
    spheroBall.roll(0, spheroBall.heading || 0, []);
};

module.exports = spheroModule;

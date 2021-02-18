"use strict"
const Leap = require('leapjs');
const Scanner = require('spherov2.js').Scanner;

const WAIT_TIME = 100;
let spheroBall;
let controller;
let waitIntervalForNextCommandId;
let isStopped = true;

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
            // console.log(frame.handsMap);
            handleSwipe(frame.handsMap[handsKeys[0]]);
        } else {
            console.log('No hands');
        };
    });
}

const handleSwipe = hand => {
    let towardsBackwards = hand.pitch();
    let leftRight = hand.roll();
    let previousFrame = controller.frame(1);
    const towardsBackwardsDeltaColibration = 0;
    const leftRightDeltaColibration = +0.15;
    towardsBackwards += towardsBackwardsDeltaColibration;
    leftRight += leftRightDeltaColibration;

    const maxSpeed = 100;
    const minLeft = 0.2;
    const minRight = -0.2;
    const minToward = -0.15;
    const minBackward = 0.2;

    const maxLimit = 1;

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
    
    // console.log(newSpeed, newDirection);
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
    isStopped = true;
    if (speed !== 0 && !speed) {
      speed = 70;
    } else if (speed === 0) {
        return stopSphero(spheroBall)
    }
    spheroBall.heading = direction;
    spheroBall.roll(speed, direction, []);
}

const stopSphero = spheroBall => {
    if (isStopped) {
        return;
    }
    console.log('Stop sphero');
    isStopped = false;
    spheroBall.roll(0, spheroBall.heading || 0, []);
};

module.exports = spheroModule;

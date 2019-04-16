
const {EventEmitter} = require('events');
const os = require("os");
const bencode = require('bencode');
const debug = require('debug')('poc_chat_torrent');

const CHAT_EXT = 'poc_chat_torrent';

const MSG = 1;
const ME = 2;

class ChatExtension extends EventEmitter {

    constructor(wire) {
        super();
        this._wire = wire;
        this._nick = os.userInfo().username;
        this._remoteNick = `unknow`;
        this._ready = false;

        debug(`Extended handshake with nick ${this._nick}`);
        wire.extendedHandshake[`${CHAT_EXT}_nick`] = Buffer.from(this._nick);
    }

    get name() {
        return CHAT_EXT;
    }

    get wire() {
        return this._wire;
    }

    get ready() {
        return this._ready;
    }

    _send(msg, payload) {
        const pack = {
            msg,
            payload,
        };
        
        this.wire.extended(CHAT_EXT, bencode.encode(pack));
    }

    onExtendedHandshake(handshake) {
        if (!handshake.m || !handshake.m[CHAT_EXT]) {
            debug(`Wire does not support chat`);
            return;
        }

        this._remoteNick = handshake[`${CHAT_EXT}_nick`] || 'Unknow';
        debug(`Remote nickname set as ${this._remoteNick}`);
        this._ready = true;
        this.emit('nickname', this._remoteNick);
    }

    onMessage(buf) {
        const dic = bencode.decode(buf.toString());

        if (typeof dic.msg === 'undefined') {
            throw new Error(`Invalid message`);
        }

        switch (dic.msg) {
            case MSG:
                this.emit('msg', dic.payload.toString('utf8'));
                break;
            case ME:
                this.emit('me', dic.payload.toString('utf8'));
                break;
            default:
                debug(`Invalid message ${dic.msg}`);
        }
    }

    msg(message) {
        this._send(MSG, message);
    }

    me(message) {
        this._send(ME, message);
    }
}

module.exports = ChatExtension;

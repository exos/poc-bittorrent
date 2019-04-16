
const program = require('commander');
const readline = require('readline');
const colors = require('colors/safe');
const Webtorrent = require('webtorrent');
const ChatExtension = require('./lib/chat');
const packData = require('./package.json');

program
    .version(packData.version)
    .usage('<torrentId> <path>')
;

program.parse(process.argv);

const [torrentId, path] = program.args;

const client = new Webtorrent();

const torrent = client.add(torrentId, {
    path,
});

torrent.on('done', () => {
    console.log(colors.blue.underline('Torrent done'));
});

torrent.on('ready', () => {
    console.log(colors.blue.underline('Torrent ready'));
});

torrent.on('error', (err) => {
    console.log(colors.red.underline(`Torrent error: ${err}`));
});

let wires = [];

torrent.on('wire', (wire) => {
    let nickName = 'Unknow';

    wire.use(ChatExtension);
    wire.poc_chat_torrent.on('nickname', (nickname) => {
        console.log(colors.green(`${nickname} is online`));
        nickName = nickname;
        wires.push(wire);
    });

    wire.poc_chat_torrent.on('msg', (msg) => {
        console.log(colors.blue(`${nickName}: `) + colors.white(msg));
    });

    wire.poc_chat_torrent.on('me', (msg) => {
        console.log(colors.blue.italic(`${nickName} ${msg}`));
    });

    wire.on('destroy', () => {
        wires = wires.filter((w) => w !== wire);
    });

});

const rl = readline.createInterface({
  input: process.stdin,
});

rl.on('line', (line) => {

    if (line.match(/^\/[a-z]+/i)) {
        let [cmd, ...msg] = line.split(/\s/);
        msg = msg.join(' ');

        switch (cmd) {
            case '/me':
                wires.forEach((w) => w.poc_chat_torrent.me(msg));
                break;
            case '/close':
                process.exit(0);
                break;
            default:
                console.error(colors.red.underline(`Invalid command ${cmd}`));
                break;
        }

        return;
    }

    wires.forEach((w) => w.poc_chat_torrent.msg(line));
});

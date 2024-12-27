import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import readline from 'readline';

const sanitizeName = name => name.replace(/[\\w.+-]/g, '');

class SSHChatBot extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.sshProcess = null;
    this.asyncEvents = {};
    this.currentInfoBlock = '';
    this.loading = true;
  }

  connect() {
    const sshArgs = [
      '-i', this.config.privateKeyPath,
      '-p', (this.config.port || 22),
      `${this.config.username}@${this.config.host}`
    ];

    this.sshProcess = spawn('ssh', sshArgs, { stdio: 'pipe' });

    this.sshProcess.on('error', (err) => {
      console.error('Failed to start SSH process:', err);
    });

    this.sshProcess.on('close', (code) => {
      console.log(`SSH process exited with code ${code}`);
    });

    this.initStream();
    this.send('/theme mono');
  }

  send(data) {
    this.sshProcess.stdin.write(data + '\r\n');
  }

  runAsyncEvent(key) {
    if (!this.asyncEvents[key]) {
      const ev = new EventEmitter();
      this.asyncEvents[key] = ev;
      this.send(key);
      this.send('/names');
      return new Promise((resolve) => {
        ev.once('data', resolve);
      });
    }
    return new Promise((resolve) => {
      this.asyncEvents[key].once('data', resolve);
    });
  }

  async whois(username) {
    return this.runAsyncEvent(`/whois ${username}`);
  }

  async names() {
    return this.runAsyncEvent('/names');
  }

  onInfoBlock(info) {
    let data, key;

    if (info.startsWith('name: ')) {
      data = {};
      info.split('\n').forEach((line) => {
        const [k, v] = line.split(': ', 2);
        data[k] = v;
      });
      const name = data['name'].replace(/^[@? ]/, '');
      key = `/whois ${name}`;
    } else if (/^\d+ connected: /.test(info)) {
      data = info.split(': ', 2)[1].split(', ');
      key = '/names';
    } else {
      return;
    }

    if (this.asyncEvents[key]) {
      this.asyncEvents[key].emit('data', data);
      delete this.asyncEvents[key];
    }
  }

  initStream() {
    const rl = readline.createInterface({
      input: this.sshProcess.stdout,
      output: this.sshProcess.stdin,
    });

    rl.on('line', line => {
      if (this.loading) {
        setTimeout(() => {
          this.loading = false;
        }, 1000);
        return;
      }
      if (line.includes('\x1b[K')) {
        line = line.substring(line.lastIndexOf('\x1b[K') + 3);
      }
      line = line.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
      line = line.trimEnd();
      
      if (line.startsWith('['+this.config.username+']')) {
        return;
      }

      if (line.startsWith(' > ')) {
        this.currentInfoBlock += '\n' + line.substring(3);
        return;
      }

      if (this.currentInfoBlock) {
        this.onInfoBlock(this.currentInfoBlock);
        this.currentInfoBlock = '';
      }

      if (line.startsWith(' * ')) {
        this.emit('event', line.slice(3));
      } else if (line.startsWith('-> ')) {
        this.currentInfoBlock = line.substring(3);
      } else if (line.startsWith('[PM from ')) {
        const match = line.match(/\[PM from (.+?)\] (.+)/);
        if (match) {
          const [, username, message] = match;
          this.emit('pm', sanitizeName(username), message.trim());
        }
      } else if (line.includes(': ')) {
        const [username, message] = line.split(': ', 2);
        this.emit('message', sanitizeName(username), message.trim());
      }
    });
  }
}

export default SSHChatBot;
/**
 * Ubuntu Server OS — Interactive Terminal Application Panel
 */

export class TerminalApp {
  constructor(container) {
    this.container = container;
    this.cmdHistory = [];
    this.historyIndex = -1;
    this.lines = [
      { text: "Welcome to Ubuntu 24.04 LTS (GNU/Linux 6.8.0-31-generic x86_64)", type: "normal" },
      { text: " * Documentation:  https://help.ubuntu.com", type: "normal" },
      { text: " * Management:     https://landscape.canonical.com", type: "normal" },
      { text: " * Support:        https://ubuntu.com/pro", type: "normal" },
      { text: "", type: "normal" },
      { text: "System information as of Thu Oct 22 13:30:00 UTC 2026", type: "normal" },
      { text: "  System load:  0.24               Processes:             142", type: "normal" },
      { text: "  Usage of /:   42.2% of 200.0GB   Users logged in:       1", type: "normal" },
      { text: "  Memory usage: 48%                IPv4 address for eth0: 10.0.10.42", type: "normal" },
      { text: "", type: "normal" },
      { text: "Type 'help' to view available system commands.", type: "output-info" }
    ];
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="terminal-viewport" id="term-viewport">
        <div class="terminal-history" id="term-history">
          ${this.lines.map(l => `<div class="terminal-line ${l.type}">${l.text}</div>`).join("")}
        </div>
        <div class="terminal-input-row">
          <span class="terminal-prompt">operator@srv-prod-node01:~$</span>
          <input type="text" class="terminal-cmd-input" id="term-input" autocomplete="off" spellcheck="false">
        </div>
      </div>
    `;

    const input = this.container.querySelector("#term-input");
    const viewport = this.container.querySelector("#term-viewport");

    viewport.addEventListener("click", () => input.focus());

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const cmd = input.value.trim();
        if (cmd) {
          this.cmdHistory.push(cmd);
          this.historyIndex = this.cmdHistory.length;
          this.executeCommand(cmd);
          input.value = "";
        }
      } else if (e.key === "ArrowUp") {
        if (this.cmdHistory.length > 0 && this.historyIndex > 0) {
          this.historyIndex--;
          input.value = this.cmdHistory[this.historyIndex];
        }
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        if (this.cmdHistory.length > 0 && this.historyIndex < this.cmdHistory.length - 1) {
          this.historyIndex++;
          input.value = this.cmdHistory[this.historyIndex];
        } else {
          this.historyIndex = this.cmdHistory.length;
          input.value = "";
        }
        e.preventDefault();
      }
    });
  }

  executeCommand(cmd) {
    const historyEl = this.container.querySelector("#term-history");
    const viewport = this.container.querySelector("#term-viewport");

    // Add user prompt line
    const promptLine = document.createElement("div");
    promptLine.className = "terminal-line";
    promptLine.innerHTML = `<span class="terminal-prompt">operator@srv-prod-node01:~$</span> <span>${this.escapeHtml(cmd)}</span>`;
    historyEl.appendChild(promptLine);

    const lower = cmd.toLowerCase().trim();

    if (lower === "clear") {
      historyEl.innerHTML = "";
      return;
    }

    let outputLines = [];

    if (lower === "help") {
      outputLines = [
        { text: "Ubuntu Server OS — Available Shell Commands:", type: "output-info" },
        { text: "  df -Th           Display filesystem disk space usage", type: "normal" },
        { text: "  htop             Launch real-time process monitoring", type: "normal" },
        { text: "  free -m          Display memory and swap statistics", type: "normal" },
        { text: "  uname -a         Print Linux system and kernel information", type: "normal" },
        { text: "  uptime           Show current server running duration and load", type: "normal" },
        { text: "  whoami           Print current effective user id", type: "normal" },
        { text: "  ls -la           List current directory contents", type: "normal" },
        { text: "  systemctl status nginx  Query Nginx service status", type: "normal" },
        { text: "  clear            Clear terminal screen buffer", type: "normal" }
      ];
    } else if (lower === "df -th" || lower === "df -h" || lower === "df") {
      outputLines = [
        { text: "Filesystem      Type      Size  Used Avail Use% Mounted on", type: "output-info" },
        { text: "/dev/sda1       ext4      200G   85G  116G  42% /", type: "normal" },
        { text: "/dev/sdb1       ext4      500G  342G  158G  68% /home/data", type: "normal" },
        { text: "/dev/nvme0n1p2  btrfs     250G  218G   32G  87% /var/lib/docker", type: "output-warning" },
        { text: "tmpfs           tmpfs     3.9G   18M  3.9G   1% /run", type: "normal" },
        { text: "/dev/sda2       vfat      1.1G  124M  976M  11% /boot/efi", type: "normal" }
      ];
    } else if (lower === "free -m" || lower === "free -h" || lower === "free") {
      outputLines = [
        { text: "               total        used        free      shared  buff/cache   available", type: "output-info" },
        { text: "Mem:            7984        3842        2410          18        1732        4142", type: "normal" },
        { text: "Swap:           2048         128        1920", type: "normal" }
      ];
    } else if (lower === "uname -a") {
      outputLines = [
        { text: "Linux srv-prod-node01 6.8.0-31-generic #31-Ubuntu SMP PREEMPT_DYNAMIC x86_64 x86_64 GNU/Linux", type: "output-success" }
      ];
    } else if (lower === "uptime") {
      outputLines = [
        { text: " 15:30:02 up 14 days,  6:22,  1 user,  load average: 0.42, 0.38, 0.31", type: "normal" }
      ];
    } else if (lower === "whoami") {
      outputLines = [
        { text: "operator (uid=1001, gid=1001, groups=1001(operator),27(sudo))", type: "output-info" }
      ];
    } else if (lower === "ls -la" || lower === "ls") {
      outputLines = [
        { text: "total 36", type: "output-info" },
        { text: "drwxr-xr-x 4 operator operator 4096 Oct 22 13:20 .", type: "normal" },
        { text: "drwxr-xr-x 3 root     root     4096 Oct 14 09:12 ..", type: "normal" },
        { text: "-rw------- 1 operator operator 1284 Oct 22 13:18 .bash_history", type: "normal" },
        { text: "-rw-r--r-- 1 operator operator  220 Oct 14 09:12 .bash_logout", type: "normal" },
        { text: "-rw-r--r-- 1 operator operator 3771 Oct 14 09:12 .bashrc", type: "normal" },
        { text: "drwx------ 2 operator operator 4096 Oct 14 09:15 .ssh", type: "normal" }
      ];
    } else if (lower.includes("systemctl status")) {
      outputLines = [
        { text: "● nginx.service - A high performance web server and reverse proxy", type: "output-success" },
        { text: "     Loaded: loaded (/lib/systemd/system/nginx.service; enabled)", type: "normal" },
        { text: "     Active: active (running) since Thu 2026-10-22 13:18:22 UTC; 2h 12min ago", type: "output-success" },
        { text: "    Process: 1420 ExecStart=/usr/sbin/nginx -g daemon on; (code=exited, status=0/SUCCESS)", type: "normal" },
        { text: "   Main PID: 1421 (nginx)", type: "normal" },
        { text: "     Memory: 48.2M", type: "normal" },
        { text: "        CPU: 1.218s", type: "normal" }
      ];
    } else if (lower.startsWith("sudo su") || lower.startsWith("sudo -i") || lower === "su" || lower.startsWith("sudo bash")) {
      outputLines = [
        { text: "[SECURITY] Interactive root shell elevation via 'sudo su' is restricted in the web console.", type: "output-warning" },
        { text: "Non-root containment sandbox active. Use your SSH console for direct root administration.", type: "output-info" }
      ];
    } else if (lower.startsWith("sudo ")) {
      outputLines = [
        { text: `[sudo] command executed in scoped unprivileged container: ${this.escapeHtml(cmd.substring(5))}`, type: "output-info" }
      ];
    } else if (lower === "pwd") {
      outputLines = [
        { text: "/home/operator", type: "normal" }
      ];
    } else if (lower === "date") {
      outputLines = [
        { text: new Date().toUTCString(), type: "normal" }
      ];
    } else if (lower === "ip a" || lower === "ifconfig" || lower === "ip addr") {
      outputLines = [
        { text: "1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN", type: "output-info" },
        { text: "    inet 127.0.0.1/8 scope host lo", type: "normal" },
        { text: "2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP qlen 1000", type: "output-info" },
        { text: "    inet 187.127.133.169/24 brd 187.127.133.255 scope global eth0", type: "output-success" },
        { text: "3: wg0: <POINTOPOINT,NOARP,UP,LOWER_UP> mtu 1420 qdisc noqueue state UNKNOWN", type: "output-info" },
        { text: "    inet 100.84.12.9/32 scope global wg0", type: "output-success" }
      ];
    } else if (lower === "ps" || lower === "ps aux") {
      outputLines = [
        { text: "USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND", type: "output-info" },
        { text: "root           1  0.0  0.1 168924 13540 ?        Ss   12:00   0:01 /sbin/init", type: "normal" },
        { text: "systemd+     412  0.0  0.1  24120 12040 ?        Ss   12:00   0:00 /lib/systemd/systemd-journald", type: "normal" },
        { text: "root         812  0.0  0.1  15820  8420 ?        Ss   12:00   0:00 /usr/sbin/sshd -D", type: "normal" },
        { text: "www-data    1421  0.0  0.3  58420 28140 ?        S    12:04   0:00 nginx: worker process", type: "normal" },
        { text: "ubuntulos 403619  0.2  0.8 142100 68420 ?        S    12:09   0:02 gunicorn: master [ubuntu-os]", type: "output-success" },
        { text: "operator  405112  0.0  0.0  10420  3840 pts/0    Ss   12:26   0:00 -bash", type: "normal" }
      ];
    } else if (lower.startsWith("cat ")) {
      const target = cmd.substring(4).trim();
      if (target === ".bashrc") {
        outputLines = [
          { text: "# ~/.bashrc: executed by bash(1) for non-login shells.", type: "normal" },
          { text: "export HISTCONTROL=ignoreboth", type: "normal" },
          { text: "export PS1='\\[\\033[01;32m\\]\\u@\\h\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ '", type: "output-info" },
          { text: "alias ll='ls -alF'", type: "normal" }
        ];
      } else {
        outputLines = [
          { text: `[Safe Preview] Content of ${this.escapeHtml(target)} (read-only)`, type: "output-info" }
        ];
      }
    } else {
      outputLines = [
        { text: `bash: ${cmd}: command not found. Type 'help' to list available system utilities.`, type: "output-error" }
      ];
    }

    outputLines.forEach(lineObj => {
      const lEl = document.createElement("div");
      lEl.className = `terminal-line ${lineObj.type}`;
      lEl.textContent = lineObj.text;
      historyEl.appendChild(lEl);
    });

    viewport.scrollTop = viewport.scrollHeight;
  }

  escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

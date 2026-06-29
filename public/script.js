// --- ANTI-THEFT SCRIPTS ---
document.addEventListener('contextmenu', event => event.preventDefault()); 
document.addEventListener('keydown', function(event) {
    if (event.keyCode === 123 || (event.ctrlKey && event.shiftKey && event.keyCode === 73) || (event.ctrlKey && event.keyCode === 85)) {
        event.preventDefault(); return false;
    }
});

// --- DEVICE DETECTION ---
function checkDeviceAccess() {
    const ua = navigator.userAgent;
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi/i.test(ua);
    if (isMobileDevice) {
        document.getElementById('mobile-blocker').style.display = 'flex';
        document.getElementById('gatekeeper-modal').style.display = 'none';
        document.getElementById('app-workspace').classList.add('hidden');
        document.getElementById('admin-dashboard').classList.add('hidden');
        return false;
    } else {
        document.getElementById('mobile-blocker').style.display = 'none';
        return true;
    }
}

// Ensure the user has a permanent Device ID for locking
let deviceId = localStorage.getItem('nosify_device');
if (!deviceId) {
    deviceId = 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    localStorage.setItem('nosify_device', deviceId);
}

let chatHistoryState = []; 
let chatArray = [];
let lastSenderId = null;
let activeSender = 1;
let activeKey = sessionStorage.getItem('nosify_session') || null;
let adminPass = sessionStorage.getItem('nosify_admin_pass') || null;

let users = {
    1: { name: "Spencer", color: "#f2f3f5", pfp: "https://cdn.discordapp.com/avatars/1501622757593714911/be3f8e45edb1d086e5503dd5c46814aa.webp?size=2048", bot: false },
    2: { name: "User 2", color: "#f2f3f5", pfp: "https://i.imgflip.com/4/385o34.png", bot: false }
};

const GRADIENTS = [
    "linear-gradient(135deg, #0f2027, #203a43, #2c5364)", "linear-gradient(135deg, #1f1c2c, #928dab)", 
    "linear-gradient(135deg, #1d2671, #c33764)", "linear-gradient(135deg, #5c258d, #4389a2)",
    "linear-gradient(135deg, #ff4b1f, #1fddff)", "linear-gradient(135deg, #eecda3, #ef629f)",
    "linear-gradient(135deg, #111111, #2c3e50)", "linear-gradient(135deg, #2c3e50, #3498db)"
];

window.onload = () => {
    if (!checkDeviceAccess()) return; 

    if (activeKey) {
        if (activeKey === "SECURE_ADMIN_TOKEN") showAdminPanel();
        else showApp(); 
    }
    const now = new Date();
    document.getElementById("msg-time").value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    saveProfiles();
};

async function loginSystem() {
    let val = document.getElementById("access-gate-key").value.trim();
    if (!val) return;
    
    let btn = document.getElementById("login-btn");
    btn.innerText = "Checking...";

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: val, deviceId: deviceId })
        });
        const data = await response.json();
        
        if (data.success) {
            if (data.role === 'admin') {
                sessionStorage.setItem('nosify_session', 'SECURE_ADMIN_TOKEN');
                sessionStorage.setItem('nosify_admin_pass', val); 
            } else {
                sessionStorage.setItem('nosify_session', val);
                sessionStorage.setItem('nosify_limits', data.left);
                sessionStorage.setItem('nosify_max', data.max);
            }
            return window.location.reload();
        } else {
            alert(data.error);
            btn.innerText = "Login";
        }
    } catch (err) {
        alert("Server error connecting to database.");
        btn.innerText = "Login";
    }
}

function showAdminPanel() {
    $("#gatekeeper-modal, #app-workspace").addClass("hidden");
    $("#admin-dashboard").removeClass("hidden");
    loadAdminData();
}

function showApp() {
    $("#gatekeeper-modal, #admin-dashboard").addClass("hidden");
    $("#app-workspace").removeClass("hidden");
    updateLimits();
}

function logoutSystem() {
    sessionStorage.clear();
    window.location.reload();
}

function updateLimits() {
    let session = sessionStorage.getItem('nosify_session');
    if (session === "SECURE_ADMIN_TOKEN") return;
    let limits = sessionStorage.getItem('nosify_limits');
    let max = sessionStorage.getItem('nosify_max');
    if (limits) document.getElementById("chats-left-display").innerText = `Left: ${limits}/${max}`;
}

async function adminAction(action, payload) {
    await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': adminPass },
        body: JSON.stringify({ action, payload })
    });
    loadAdminData();
}

async function createKey() {
    let customName = $("#adm-custom-name").val().trim();
    let k = customName ? customName : "KEY-" + Math.random().toString(36).substr(2, 6).toUpperCase();
    let time = $("#adm-key-time").val();
    let max = $("#adm-key-uses").val();
    let exp = null;
    if (time !== "perm") {
        let ms = new Date().getTime();
        if (time === "5h") exp = ms + (5*3600000);
        if (time === "1d") exp = ms + (24*3600000);
        if (time === "3d") exp = ms + (72*3600000);
    }
    
    let payload = { key: k, time: time, max: max, left: max === "perm" ? "perm" : parseInt(max), expires: exp, claimedBy: null };
    await adminAction('create_key', payload);
    $("#adm-custom-name").val("");
}

function deleteKey(idx) { adminAction('delete_key', idx); }
function copyKey(keyText) { navigator.clipboard.writeText(keyText); alert("Copied!"); }
function banDevice(devId) { if(devId && devId !== 'null' && devId !== 'Open') { adminAction('ban_device', devId); alert("Banned!"); } }
function revokeLogKey(keyString) { adminAction('revoke_key', keyString); }

async function loadAdminData() {
    const res = await fetch('/api/admin', { headers: { 'Authorization': adminPass }});
    if (!res.ok) return logoutSystem();
    const db = await res.json();

    let html = "";
    db.keys.forEach((k, i) => {
        html += `<tr>
            <td class="py-3 text-[#5865F2] font-bold">${k.key}</td>
            <td class="py-3">${k.time}</td>
            <td class="py-3 text-green-400">${k.left}</td>
            <td class="py-3 text-[10px] font-mono">${k.claimedBy ? k.claimedBy : 'Open'}</td>
            <td class="py-3 text-right">
                <button onclick="copyKey('${k.key}')" class="text-white bg-gray-800 px-2 py-1 rounded text-[10px] mr-1">Copy</button>
                <button onclick="deleteKey(${i})" class="btn-red">Del</button>
            </td>
        </tr>`;
    });
    $("#adm-keys-list").html(html);

    let logsHtml = "";
    db.logs.forEach((log) => {
        let isBanned = db.bans.includes(log.device);
        logsHtml += `<tr>
            <td class="py-3 text-gray-400 text-[10px]">${log.time}</td>
            <td class="py-3 text-[#5865F2] font-bold">${log.key}</td>
            <td class="py-3 text-[10px] font-mono ${isBanned ? 'text-red-500 line-through' : 'text-white'}">${log.device}</td>
            <td class="py-3 text-right">
                <button onclick="revokeLogKey('${log.key}')" class="text-white bg-gray-800 px-2 py-1 rounded text-[10px] mr-1 hover:bg-gray-700">Revoke</button>
                <button onclick="banDevice('${log.device}')" class="btn-red ${isBanned ? 'opacity-50 cursor-not-allowed' : ''}" ${isBanned ? 'disabled' : ''}>${isBanned ? 'Banned' : 'Ban'}</button>
            </td>
        </tr>`;
    });
    $("#adm-logs-list").html(logsHtml || `<tr><td colspan="4" class="py-3 text-center text-gray-500">No recent logins.</td></tr>`);
}

function switchTab(id) {
    $(".tab-content, .nav-item").removeClass('active');
    $("#"+id).addClass('active');
    if(id==='tab-dashboard') $("#nav-dash").addClass('active');
    if(id==='tab-profile') $("#nav-prof").addClass('active');
    if(id==='tab-tutorial') $("#nav-tutor").addClass('active');
    if(id==='tab-recents') { $("#nav-recents").addClass('active'); showRecents(); }
}

function toggleSiteTheme() { document.body.classList.toggle("light-site"); }
function toggleChatTextColor() { document.getElementById("capture-zone").classList.toggle("light-chat-text"); }
function toggleFullScreen() { document.getElementById("capture-zone").classList.toggle("fullscreen-active"); }

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

function changeBgColor() { 
    let hex = $("#chat-bg-color").val();
    $("#capture-zone").css("background", hex); 
    
    let rgb = hexToRgb(hex);
    if (rgb) {
        let lum = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b);
        if (lum > 128) {
            document.getElementById("capture-zone").classList.add("light-chat-text");
        } else {
            document.getElementById("capture-zone").classList.remove("light-chat-text");
        }
    }
}

function surpriseGradient() { 
    $("#capture-zone").css("background", GRADIENTS[Math.floor(Math.random()*GRADIENTS.length)]); 
    document.getElementById("capture-zone").classList.remove("light-chat-text");
}

function setSender(idx) {
    activeSender = idx;
    $("#btn-u1").attr('class', idx===1 ? 'p-2 text-xs font-bold rounded-lg border border-[#5865F2] bg-[#5865F2]/10 text-[#5865F2]' : 'p-2 text-xs font-bold rounded-lg border border-[var(--site-border)] text-[var(--site-text-muted)]');
    $("#btn-u2").attr('class', idx===2 ? 'p-2 text-xs font-bold rounded-lg border border-[#5865F2] bg-[#5865F2]/10 text-[#5865F2]' : 'p-2 text-xs font-bold rounded-lg border border-[var(--site-border)] text-[var(--site-text-muted)]');
}

function addMessage() {
    let txt = $("#msg-text").val();
    let img = $("#msg-img").val().trim();
    if(!txt.trim() && !img) return;

    if (activeKey !== "SECURE_ADMIN_TOKEN") {
        let limits = sessionStorage.getItem('nosify_limits');
        if (limits !== "perm") {
            let left = parseInt(limits);
            if (left <= 0) { alert("No chats left."); return logoutSystem(); }
            
            // Deduct local and cloud
            sessionStorage.setItem('nosify_limits', left - 1);
            updateLimits();
            fetch('/api/admin', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deduct_use', payload: activeKey })
            });
        }
    }

    chatArray.push({
        type: "msg", uId: activeSender, uName: users[activeSender].name, uColor: users[activeSender].color,
        uPfp: users[activeSender].pfp, bot: users[activeSender].bot, text: txt, img: img,
        time: $("#msg-time").val(), edit: $("#msg-edited").is(':checked'),
        reply: $("#msg-reply").val() !== "" ? parseInt($("#msg-reply").val()) : null,
        react: $("#msg-react").val().trim() || null
    });
    saveState(); renderChat();
    $("#msg-text, #msg-img, #msg-reply, #msg-react").val(""); $("#msg-edited").prop("checked", false);
}

function addDateLine() { chatArray.push({ type: "date", val: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }); saveState(); renderChat(); }
function addNewMsgLine() { chatArray.push({ type: "new" }); saveState(); renderChat(); }

function parseMD(str) {
    let out = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/__(.*?)__/g, '<u>$1</u>');
    out = out.replace(/\|\|(.*?)\|\|/g, '<span class="spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>');
    out = out.replace(/@([a-zA-Z0-9_]+)/g, '<span class="mention">@$1</span>');
    return out;
}

function formatTime(t) {
    if(!t) return "Today at 12:00 AM";
    let [h, m] = t.split(":");
    let hh = parseInt(h);
    return `Today at ${hh % 12 || 12}:${m} ${hh >= 12 ? 'PM' : 'AM'}`;
}

function renderChat() {
    const box = document.getElementById("chat-history");
    box.innerHTML = "";
    lastSenderId = null;

    chatArray.forEach((msg, i) => {
        if (msg.type === "date") {
            box.innerHTML += `<div class="date-divider">${msg.val}</div>`;
            lastSenderId = null;
        } else if (msg.type === "new") {
            box.innerHTML += `<div class="new-messages-divider"><span>New Messages</span></div>`;
            lastSenderId = null;
        } else if (msg.type === "msg") {
            let html = `<div class="message-row flex flex-col w-full ${lastSenderId === msg.uId ? 'chained' : ''}">`;
            
            if (msg.reply !== null && chatArray[msg.reply]) {
                let rep = chatArray[msg.reply];
                html += `<div class="reply-container"><div class="reply-line"></div><img src="${rep.uPfp}" class="reply-avatar" crossorigin="anonymous"><span class="reply-name" style="color: ${rep.uColor}">${rep.uName}</span><span class="reply-content">${parseMD(rep.text || "[Image]")}</span></div>`;
                lastSenderId = null; 
            }

            let parsedTxt = parseMD(msg.text);
            if(msg.edit) parsedTxt += `<span class="edited-tag">(edited)</span>`;
            if(msg.img) parsedTxt += `<br><img src="${msg.img}" style="max-width:350px; max-height:350px; border-radius:8px; margin-top:4px;" crossorigin="anonymous">`;

            let botTag = msg.bot ? `<span class="bot-tag"><svg viewBox="0 0 16 16" style="width:10px;height:10px;"><path fill="currentColor" d="M7.4 4h1.2v1.2H7.4V4zm0 2.4h1.2V12H7.4V6.4zM8 0a8 8 0 100 16A8 8 0 008 0z"></path></svg>APP</span>` : "";

            if (lastSenderId === msg.uId) {
                html += `<div class="pl-[56px] w-full"><div><div class="content">${parsedTxt}</div>${msg.react ? `<div class="reactions-flex"><div class="reaction-chip reacted"><span>${msg.react}</span><span class="count">1</span></div></div>` : ""}</div></div>`;
            } else {
                html += `<div class="flex w-full"><img src="${msg.uPfp}" class="avatar" crossorigin="anonymous"><div><div class="flex items-center"><span class="username" style="color: ${msg.uColor}">${msg.uName}</span>${botTag}<span class="timestamp">${formatTime(msg.time)}</span></div><div class="content">${parsedTxt}</div>${msg.react ? `<div class="reactions-flex"><div class="reaction-chip reacted"><span>${msg.react}</span><span class="count">1</span></div></div>` : ""}</div></div>`;
            }
            html += `</div>`;
            box.innerHTML += html;
            lastSenderId = msg.uId;
        }
    });
    let wrap = document.getElementById("capture-zone");
    wrap.scrollTop = wrap.scrollHeight;
}

function saveState() {
    if(chatArray.length===0) return;
    chatHistoryState.unshift({ time: new Date().toLocaleTimeString(), data: JSON.parse(JSON.stringify(chatArray)) });
    if(chatHistoryState.length > 10) chatHistoryState.pop();
}
function showRecents() {
    let html = "";
    chatHistoryState.forEach((s, i) => {
        html += `<div class="border border-[var(--site-border)] p-3 rounded-lg flex items-center justify-between text-xs mb-2"><div><span class="text-[#5865F2] font-bold">State ${i+1}</span><span class="text-[var(--site-text-muted)] ml-2">${s.time}</span></div><button onclick="restoreChat(${i})" class="btn-dark py-1 px-3 text-[#5865F2]">Restore</button></div>`;
    });
    $("#recovery-list").html(html || `<p class="text-xs text-[var(--site-text-muted)]">No logs.</p>`);
}
function restoreChat(idx) { chatArray = JSON.parse(JSON.stringify(chatHistoryState[idx].data)); renderChat(); switchTab('tab-dashboard'); }

function openClearMenu() { $("#clear-modal").removeClass("hidden"); }
function closeClearMenu() { $("#clear-modal").addClass("hidden"); }
function clearWholeChat() { chatArray = []; saveState(); renderChat(); closeClearMenu(); }
function clearSingleMessage() {
    let i = parseInt($("#clear-index").val());
    if(chatArray[i]) { chatArray.splice(i, 1); saveState(); renderChat(); closeClearMenu(); $("#clear-index").val(""); }
}

function saveProfiles() {
    users[1] = { name: $("#u1-name").val(), color: $("#u1-color").val(), pfp: $("#u1-pfp").val(), bot: $("#u1-bot").is(':checked') };
    users[2] = { name: $("#u2-name").val(), color: $("#u2-color").val(), pfp: $("#u2-pfp").val(), bot: $("#u2-bot").is(':checked') };
    $("#btn-u1").text(users[1].name); $("#btn-u2").text(users[2].name);
    $("#fake-placeholder").attr("placeholder", `Message @${users[2].name}`);
    renderChat();
}

function randomizeUser(id) {
    const names = ["Specter", "Viper", "Glitch", "Cipher", "Rogue", "Chronos"];
    const pfps = ["https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=60", "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60", "https://i.imgflip.com/4/385o34.png"];
    $("#u"+id+"-name").val(names[Math.floor(Math.random()*names.length)] + Math.floor(Math.random()*99));
    $("#u"+id+"-pfp").val(pfps[Math.floor(Math.random()*pfps.length)]);
    saveProfiles();
        }
                

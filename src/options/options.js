import { getStorage, setStorage } from '../lib/storage';

const sensitivity = document.getElementById('sensitivity');
const userKeywords = document.getElementById('userKeywords');
const whitelist = document.getElementById('whitelist');
const saveBtn = document.getElementById('saveBtn');
const status = document.getElementById('status');

async function loadSettings() {
  const data = await getStorage();

  sensitivity.value = data.settings.sensitivity;
  userKeywords.value = data.lists.userKeywords.join('\n');
  whitelist.value = data.lists.whitelist.join('\n');
}

async function saveSettings() {
  const data = await getStorage();

  data.settings.sensitivity = sensitivity.value;
  data.lists.userKeywords = userKeywords.value
    .split('\n')
    .map((k) => k.trim())
    .filter((k) => k !== '');

  data.lists.whitelist = whitelist.value
    .split('\n')
    .map((d) => d.trim())
    .filter((d) => d !== '');

  await setStorage(data);

  // Show status
  status.style.display = 'inline';
  setTimeout(() => {
    status.style.display = 'none';
  }, 2000);
}

document.addEventListener('DOMContentLoaded', loadSettings);
saveBtn.addEventListener('click', saveSettings);

const greetings = [
  ['Coucou, mon chaton !', '嗨，我的小猫咪！'],
  ['On fait la sieste ?', '我们睡个午觉吧？'],
  ['Un petit câlin ?', '要一个小小的抱抱吗？'],
  ['Tu veux jouer avec moi ?', '你想跟我玩吗？']
];

const words = [
  ['un chaton', '一只小猫'],
  ['un câlin', '一个拥抱'],
  ['une sieste', '一次午睡'],
  ['une patte', '一只爪子'],
  ['une moustache', '一根胡须'],
  ['un poisson', '一条鱼'],
  ['une étoile', '一颗星星'],
  ['ronronner', '发出呼噜声'],
  ['dormir', '睡觉'],
  ['jouer', '玩耍'],
  ['miauler', '喵喵叫'],
  ['un coussin', '一个靠垫']
];

const sleeping = 'assets/布偶猫_睡觉.png';
const lookingUp = 'assets/布偶猫_抬头待机.png';
const waitingForGuess = 'assets/布偶猫_待机.png';
const waving = 'assets/布偶猫_挥爪.png';

const petArea = document.querySelector('main');
const pet = document.querySelector('#pet');
const pose = document.querySelector('#pose');
const speech = document.querySelector('#speech');
const french = document.querySelector('#french');
const translation = document.querySelector('#translation');
let mode = 'greet';
let nextGreeting = 0;
let nextWord = 0;
let answer = null;
let hideSpeech;
let hovering = false;
let speechOpen = false;
let dragStart;
let dragged = false;
let calendarRequest = 0;

function updatePose() {
  if (speechOpen) {
    pose.src = answer === null ? waving : waitingForGuess;
  } else {
    pose.src = hovering ? lookingUp : sleeping;
  }
}

pet.addEventListener('pointerenter', () => {
  hovering = true;
  updatePose();
});

pet.addEventListener('pointerleave', () => {
  hovering = false;
  updatePose();
});

function closeSpeech() {
  calendarRequest++;
  speech.classList.remove('calendar');
  clearTimeout(hideSpeech);
  speech.style.visibility = 'hidden';
  answer = null;
  speechOpen = false;
  updatePose();
}

petArea.addEventListener('pointerleave', () => {
  hovering = false;
  closeSpeech();
});

window.petModes.onChange((selectedMode) => {
  mode = selectedMode;
  closeSpeech();
});

pet.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || event.ctrlKey) return;

  dragged = false;
  dragStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
  pet.setPointerCapture(event.pointerId);
});

pet.addEventListener('pointermove', (event) => {
  if (event.pointerId !== dragStart?.id || (event.buttons & 1) === 0) return;

  const distance = Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y);
  if (!dragged && distance < 5) return;

  if (!dragged) {
    dragged = true;
    closeSpeech();
  }
  window.petModes.drag(dragStart.x, dragStart.y);
});

pet.addEventListener('lostpointercapture', (event) => {
  if (event.pointerId === dragStart?.id) dragStart = undefined;
});

pet.addEventListener('click', async (event) => {
  if (dragged && event.detail > 0) return;

  clearTimeout(hideSpeech);
  const request = ++calendarRequest;
  speech.classList.remove('calendar');

  if (mode === 'calendar' || mode === 'reminders') {
    answer = null;
    speechOpen = true;
    speech.classList.add('calendar');
    french.textContent = mode === 'calendar' ? '你的日历' : '你的提醒事项';
    translation.textContent = '正在查询未来十天…';
    speech.style.visibility = 'visible';
    updatePose();
    let message;
    try {
      message = await window.petModes.getCalendar(mode);
    } catch (error) {
      message = '暂时查询失败，请重试。';
    }
    if (request !== calendarRequest) return;
    translation.textContent = message;
    return;
  }

  if (mode === 'quiz') {
    const [word, meaning] = words[nextWord];
    nextWord = (nextWord + 1) % words.length;
    french.textContent = word;
    translation.textContent = '点这里看中文';
    answer = meaning;
  } else {
    const [line, meaning] = mode === 'feed'
      ? ['Miam, merci !', '小鱼真好吃，谢谢你！']
      : greetings[nextGreeting];
    if (mode === 'greet') {
      nextGreeting = (nextGreeting + 1) % greetings.length;
    }
    french.textContent = line;
    translation.textContent = meaning;
    answer = null;
    hideSpeech = setTimeout(closeSpeech, 5000);
  }

  speechOpen = true;
  speech.style.visibility = 'visible';
  updatePose();
});

speech.addEventListener('click', () => {
  if (answer === null) return;

  translation.textContent = answer;
  answer = null;
  updatePose();
  hideSpeech = setTimeout(closeSpeech, 5000);
});

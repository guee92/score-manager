//document.getElementById('scoreForm').addEventListener('submit', async (e) => {
async function handleFormSubmit(e, formId) {
  e.preventDefault();

  const form = document.getElementById(formId);
  const gp = form.querySelector('#gp').value;
  const nmField = form.querySelector('#nm');
  if (!nmField || nmField.value.trim() === '') {
    alert('이름(nm)을 입력하세요.');
    nmField.focus(); // focus로 사용자에게 입력 요구
    return;
  }
  
  const point = form.querySelector('#point').value || form.querySelector('#extraPoint').value; // 점수 필드
  const comment = form.querySelector('#comment').value;
  const user = form.querySelector('#user').value;

  try {
    // 서버에 데이터 전송
    const response = await fetch('/scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ gp, nm: nmField.value, point, comment, user }),
    });

    if (!response.ok) {
      throw new Error('Failed to add score');
    }

    // 폼 초기화
    const nmValue = nmField.value; // 현재 이름 값 저장
	form.reset(); // 폼 초기화
	nmField.value = nmValue; // 이름 값 복원

    form.querySelector('#point, #extraPoint').value = 0; // 점수 초기화

    // 입력자 다시 설정
    await setUserNM();

    // 점수 목록 새로 불러오기
    loadScores();
    toggleSubmitButton();
  } catch (error) {
    console.error('Error:', error);
    alert('Error adding score');
  }
}

// 두 폼에 이벤트 핸들러 추가
['scoreForm', 'scoreForm2'].forEach(formId => {
  document.getElementById(formId).addEventListener('submit', (e) => handleFormSubmit(e, 'scoreForm'));
});

// 점수 목록 불러오기
async function loadScores() {
  try {
    const response = await fetch(`/scores?gp=${encodeURIComponent(getURLParameter('gp'))}`);
    if (!response.ok) {
      throw new Error('Failed to fetch scores');
    }

    const scores = await response.json();
    const scoreList = document.getElementById('scoreList');
    scoreList.innerHTML = '';

    scores.forEach((score) => {
      const li = document.createElement('li');
	  li.className = 'score-list-item'; // flexbox 스타일 적용
      li.textContent = `${score.nm} (${score.gp}) - 총점: ${score.point}`;

      // 체크 버튼 추가
      const checkButton = document.createElement('button');
      checkButton.textContent = '체크';
      checkButton.className = 'custom-button check';
      checkButton.addEventListener('click', (e) => {
		e.stopPropagation();
        const gp = score.gp; // gp 값을 전달하기 위한 변수
        const nm = score.nm; // nm 값을 전달하기 위한 변수
		const chk = getURLParameter('chk') || 'N'; // chk 값을 전달하기 위한 변수, 기본값 'N'
        window.location.href = `/chklist.html?gp=${encodeURIComponent(gp)}&nm=${encodeURIComponent(nm)}&chk=${encodeURIComponent(chk)}`;
      });

      // 버튼 컨테이너 추가
      const buttonContainer = document.createElement('div');
      buttonContainer.style.display = 'flex';
      buttonContainer.style.gap = '5px';
      buttonContainer.appendChild(checkButton);

      li.appendChild(buttonContainer);
      scoreList.appendChild(li);
    });
  } catch (error) {
    console.error('Error:', error);
    alert('Error fetching scores');
  }
}

// 자녀 버튼 만들기
async function loadChildButtons() {
  const gp = getURLParameter('gp'); // URL에서 gp 값을 가져옵니다.

  try {
    // 서버에서 child 데이터 가져오기
    const response = await fetch(`/childs?gp=${encodeURIComponent(gp)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch child data'); // 요청 실패 시 오류 처리
    }

    const childs = await response.json(); // JSON 데이터를 가져옵니다.
    const nameInputContainer = document.querySelector('.name-input-container');

    // 기존 버튼 제거
    nameInputContainer.innerHTML = `
      <input type="text" id="nm" placeholder="이름" required />
    `;

    // 동적으로 버튼 생성
    childs.forEach(child => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = child.user; // 사용자 이름을 버튼 텍스트로 설정
      button.onclick = () => selectName(child.user); // 버튼 클릭 시 selectName 함수 호출
      nameInputContainer.appendChild(button);
    });
  } catch (error) {
    console.error('Error loading child buttons:', error);
    alert('Error loading child data');
  }
}

// 기준 점수
async function loadPList() {
  const gp = getURLParameter('gp'); // URL에서 gp 값을 가져옵니다.
	
  try {
    const response = await fetch(`/list?gp=${encodeURIComponent(gp)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch p_list');
    }

    const data = await response.json();
    const pListElement = document.getElementById('pList');
    pListElement.innerHTML = '';

    data.forEach(item => {
      const row = document.createElement('tr');

	  const codeCell = document.createElement('td');
      codeCell.style.display = 'none'; // 숨겨진 셀
      codeCell.textContent = item.cd;
	  
      const nameCell = document.createElement('td');
      nameCell.textContent = item.nm;

      const pointCell = document.createElement('td');
      pointCell.textContent = item.point;
	  
	  // 음수값에 'negative' 클래스 추가
      if (item.point < 0) {
        pointCell.classList.add('negative');
      }
	  
      row.appendChild(nameCell);
      row.appendChild(pointCell);
      pListElement.appendChild(row);
    });
  } catch (error) {
    console.error('Error:', error);
    alert('Error fetching p_list');
  }
}

// URL에서 사용자 이름 가져오기
function getURLParameter(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}
	
// 점수 저장 버튼 활성화/비활성화 함수
function toggleSubmitButton() {
  const point = document.getElementById('point').value;
  const name = document.getElementById('nm').value.trim();
  const submitBtn = document.getElementById('submitBtn');
  const extraSubmitBtn = document.getElementById('extraSubmitBtn');

  // 점수가 0이거나 이름이 비어있으면 버튼 비활성화
  if (point === '' || Number(point) === 0 || getURLParameter('chk')==='N') {
    submitBtn.disabled = extraSubmitBtn.disabled = true;
  } else {
    submitBtn.disabled = extraSubmitBtn.disabled = false;
  }
  document.getElementById('extraPoint').value = document.getElementById('point').value;
}
	
// chk 값에 따라 scoreForm 숨기기
function hideScoreFormBasedOnChk() {
  if (getURLParameter('chk') === 'N') {
    document.getElementById('scoreForm').style.display = 'none';
	document.getElementById('edit').style.display = 'none';
	
	document.getElementById('scoreForm2').style.display = 'none';
  }
}

// 이름 선택 함수
function selectName(name) {
  document.getElementById('nm').value = name;
}

// 점수 선택 함수 (점수 누적)
function selectScore(score) {
  const pointInput = document.getElementById('point');

  if (score === 0) {
	pointInput.value = 0; // 0 버튼을 누르면 점수를 0으로 초기화
	document.getElementById('comment').value = '';
  } else {
	let currentScore = parseInt(pointInput.value) || 0;
	pointInput.value = currentScore + score; // 다른 버튼을 누르면 점수 누적
  }
  toggleSubmitButton();
}

// 입력자에 사용자이름 자동 설정
async function setUserNM() {
	document.getElementById('user').value = getURLParameter('user');
	document.getElementById('gp').value = getURLParameter('gp');
}

// 기준 점수 목록에 클릭 이벤트 추가하는 함수
function addClickEventToScores() {
  const rows = document.querySelectorAll('#pListTable tbody tr');
  const cumulativeCheck = document.getElementById('cumulativeCheck');
  
  rows.forEach(row => {
	row.addEventListener('click', () => {
	  const scoreCell = row.cells[1];
	  const nameCell = row.cells[0];
	  
	  const score = parseInt(scoreCell.textContent, 10);
	  const name = nameCell.textContent;
	  
	  const pointInput = document.getElementById('point');
      const commentInput = document.getElementById('comment');
	  
	  if (cumulativeCheck.checked) {
        let currentScore = parseInt(pointInput.value) || 0;
        pointInput.value = currentScore + score;
		commentInput.value += commentInput.value ? `\n${name}` : name;
      } else {
        pointInput.value = score;
		commentInput.value = name;
      }
      
	  toggleSubmitButton();
	});
  });
}

// 기준 점수 불러온 후 클릭 이벤트 적용
async function loadPListWithClickEvents() {
	await loadPList(); // 기존 점수 목록 불러오는 함수
	addClickEventToScores();
}
	
// 총점 클릭 시 detail.html로 이동
function goToDetailsPage(gp, nm) {
  window.location.href = `detail.html?gp=${encodeURIComponent(gp)}&nm=${encodeURIComponent(nm)}`;
}

// 총점 클릭 이벤트 추가
function addClickEventToTotalScores() {
  const items = document.querySelectorAll('#scoreList li');
  items.forEach(item => {
    item.addEventListener('click', () => {
      const gp = document.getElementById('gp').value;
      const nm = item.textContent.split(' ')[0]; // 이름 부분만 추출
      goToDetailsPage(gp, nm);
    });
  });
  
  document.getElementById('edit').addEventListener('click', () => {
  const gp = getURLParameter('gp'); // URL에서 gp 값을 가져옵니다
  if (gp) {
    window.location.href = `/crud.html?gp=${encodeURIComponent(gp)}`; // gp 값을 전달하여 crud.html 호출
  } else {
    alert('gp 값이 없습니다.');
  }
});
}

// 페이지 로드 시 점수 목록 불러오기
window.onload = async () => {
  setUserNM();
  await loadPListWithClickEvents();  // 기준 점수 목록을 불러온 후 클릭 이벤트를 바인딩
  await loadScores();
  await loadChildButtons();
  addClickEventToTotalScores();  // 총점 클릭 이벤트 추가
  toggleSubmitButton();
  hideScoreFormBasedOnChk();
};


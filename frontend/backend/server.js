const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');
const path = require('path'); // 경로 모듈 추가
const { exec } = require('child_process'); // 시스템 명령어 실행 모듈

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0'; // 모든 네트워크 인터페이스에서 접속 허용

app.use(cors());
app.use(bodyParser.json());

// 정적 파일 제공 설정 (project/frontend 경로 사용)
app.use(express.static(path.join(__dirname, '../frontend')));

// 서버 재기동 엔드포인트
app.post('/restart', (req, res) => {
  res.send('서버를 재기동합니다...5초만 기다려주세요');
  exec('pm2 restart backend-server', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res.status(500).send('서버 재기동 중 오류가 발생했습니다.');
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
  });
});

// 점수 목록 조회
app.get('/scores', (req, res) => {
  const { gp } = req.query;
  const params = [gp];

  const query = `
    SELECT a.gp, a.user as nm, NVL(SUM(b.point), 0) AS point
    FROM p_user a
    LEFT JOIN p_table b ON a.gp = b.gp AND a.user = b.nm 
      AND DATE_FORMAT(b.c_date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
    WHERE a.gp = ? AND a.chk = 'N'
    GROUP BY a.gp, a.user
    ORDER BY a.user
  `;

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).send({ error: err.message });
    res.json(results);
  });
});

// 점수 추가
app.post('/scores', (req, res) => {
  const { gp, nm, point, comment, user } = req.body;
  const params = [gp, nm, point, comment, user];

  const query = `
    INSERT INTO p_table (gp, nm, point, comment, user, c_date)
    VALUES (?, ?, ?, ?, ?, SYSDATE())
  `;

  db.query(query, params, (err, result) => {
    if (err) return res.status(500).send({ error: err.message });
    res.json({ message: 'Score added', id: result.insertId });
  });
});

// 기준 점수 조회
app.get('/list', (req, res) => {
  const { gp } = req.query;

  const query = gp
    ? 'SELECT cd, nm, point FROM p_list WHERE gp = ?'
    : 'SELECT cd, nm, point FROM p_list';

  const params = gp ? [gp] : [];

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).send({ error: err.message });
    res.json(results);
  });
});


// 사용자 가져오기
app.get('/users', (req, res) => {
  const { gp } = req.query;
  const params = [gp];
  
  const query = 'SELECT gp, user, pw, chk FROM p_user WHERE gp = ? ORDER BY SEQ';

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).send({ error: err.message });
    res.json(results);
  });
});

// 자녀 버튼으로 가져오기
app.get('/childs', (req, res) => {
  const { gp } = req.query; // URL에서 gp 값을 가져옵니다.

  if (!gp) {
    return res.status(400).json({ error: 'Group parameter (gp) is required.' }); // gp 값이 없으면 오류 반환
  }

  // chk는 'N'으로 고정
  const query = 'SELECT gp, user, pw, chk FROM p_user WHERE gp = ? AND chk = ?';
  db.query(query, [gp, 'N'], (err, results) => {
    if (err) {
      console.error('Database error:', err); // 데이터베이스 오류 로그
      return res.status(500).send('Error querying database');
    }
    res.json(results); // 결과를 클라이언트에 반환
  });
});

// 기본 라우트로 frontend의 index.html 제공
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// 세부 점수 목록 조회
app.get('/details', (req, res) => {
  const { gp, nm } = req.query;
  const query = `
    SELECT c_date, nm, point, comment, user 
    FROM p_table 
    WHERE gp = ? AND nm = ?  AND MONTH(c_date) = MONTH(CURDATE())
	ORDER BY c_date DESC
  `;

  db.query(query, [gp, nm], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

// 점수 수정
app.post('/update', (req, res) => {
  const { cd, newName, newPoint, gp } = req.body;
  if (!cd || !newName || newPoint == null) {
    return res.status(400).send('Missing required fields');
  }

  const query = 'UPDATE p_list SET nm = ?, point = ? WHERE cd = ? and gp = ?';
  db.query(query, [newName, newPoint, cd, gp], (err, results) => {
    if (err) return res.status(500).send(err);
    res.send('Data updated successfully');
  });
});

// 점수 삭제
app.post('/delete', (req, res) => {
  const { name, gp } = req.body;
  if (!name) {
    return res.status(400).send('Missing required field: name');
  }

  const query = 'DELETE FROM p_list WHERE nm = ? and gp = ?';
  db.query(query, [name, gp], (err, results) => {
    if (err) return res.status(500).send(err);
    res.send('Data deleted successfully');
  });
});

// 점수 추가
app.post('/add', (req, res) => {
  const { nm, point, gp } = req.body;
  if (!nm || point == null || !gp) {
    return res.status(400).send('Missing required fields');
  }

  const query = 'INSERT INTO p_list (nm, point, gp) VALUES (?, ?, ?)';
  db.query(query, [nm, point, gp], (err, results) => {
    if (err) return res.status(500).send(err);
    res.status(201).send('Data added successfully');
  });
});

//체크리스트
app.get('/chklist', (req, res) => {
    const { gp, nm } = req.query;
    if (!nm) {
        return res.status(400).send({ error: '이름(nm)을 입력하세요.' });
    }

    const query = `
        SELECT T1.cd, T1.nm, T1.comment, (SELECT point FROM p_list where gp = ? AND nm = T1.item_nm) AS point,
               IFNULL(CASE WHEN DATE(T2.chkdate) = CURDATE() THEN 'Y' ELSE 'N' END, 'N') AS chk_status
        FROM p_chklist T1
        LEFT JOIN p_chklistchk T2 ON T1.cd = T2.cd
        WHERE T1.nm = ?
    `;

    db.query(query, [gp, nm], (err, rows) => {
        if (err) {
            console.error('DB 오류:', err);
            return res.status(500).send({ error: '데이터를 가져오는 중 오류가 발생했습니다.' });
        }
        res.json(rows);
    });
});

app.post('/updateChkStatus', (req, res) => {
    const { cd, nm, comment, chk_status } = req.body;

    if (!cd || !nm || !chk_status) {
        return res.status(400).send({ error: 'cd, nm, chk_status를 모두 입력하세요.' });
    }

    if (chk_status === 'Y') {
        // 삽입 또는 업데이트
        const query = `
            INSERT INTO p_chklistchk (cd, nm, comment, chkdate)
            VALUES (?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                nm = VALUES(nm),
                comment = VALUES(comment),
                chkdate = NOW();
        `;
        db.query(query, [cd, nm, comment], (err, results) => {
            if (err) {
                console.error('DB 업데이트 오류:', err);
                return res.status(500).send({ error: '체크 상태 업데이트 중 오류가 발생했습니다.' });
            }

            res.send({ success: true, affectedRows: results.affectedRows });
        });
    } else {
        // 삭제
        const query = `
            DELETE FROM p_chklistchk
            WHERE cd = ?;
        `;
        db.query(query, [cd], (err, results) => {
            if (err) {
                console.error('DB 삭제 오류:', err);
                return res.status(500).send({ error: '데이터 삭제 중 오류가 발생했습니다.' });
            }

            res.send({ success: true, affectedRows: results.affectedRows });
        });
    }
});




// 체크리스트 목록
app.get("/chklistedit", (req, res) => {
	const { nm } = req.query;
    db.query("SELECT * FROM p_chklist where nm = ?", [nm],(error, rows) => {
        if (error) {
            console.error(error);
            res.status(500).send("Error fetching data.");
        } else {
            res.json(rows);
        }
    });
});

// 데이터 추가
app.post("/chklistedit", (req, res) => {
    const { nm, comment } = req.body;
    db.query("INSERT INTO p_chklist (nm, comment) VALUES (?, ?)", [nm, comment], (error, result) => {
        if (error) {
            console.error(error);
            res.status(500).send("Error inserting data.");
        } else {
            res.status(201).json({ cd: result.insertId });
        }
    });
});

// 데이터 수정
app.put("/chklistedit/:cd", (req, res) => {
    const { cd } = req.params;
    const { nm, comment, item_nm } = req.body;
    db.query("UPDATE p_chklist SET nm = ?, comment = ?, item_nm = ? WHERE cd = ?", [nm, comment, item_nm, cd], (error) => {
        if (error) {
            console.error(error);
            res.status(500).send("Error updating data.");
        } else {
            res.sendStatus(200);
        }
    });
});

// 데이터 삭제
app.delete("/chklistedit/:cd", (req, res) => {
    const { cd } = req.params;
    db.query("DELETE FROM p_chklist WHERE cd = ?", [cd], (error) => {
        if (error) {
            console.error(error);
            res.status(500).send("Error deleting data.");
        } else {
            res.sendStatus(200);
        }
    });
});


// 서버 실행
app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

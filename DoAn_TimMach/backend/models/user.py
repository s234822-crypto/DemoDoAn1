"""
Model User cho hệ thống đăng ký/đăng nhập
Sử dụng bảng TaiKhoan (tài khoản) và BenhNhan (bệnh nhân) trên SQL Server.
"""

import sqlite3
import os
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

try:
    import pyodbc
except ImportError:
    pyodbc = None


DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'database', 'app.db')

# ================== Mapping helpers ==================

_RISK_TO_VN = {
    'low': 'Nguy cơ thấp',
    'medium': 'Nguy cơ trung bình',
    'high': 'Nguy cơ cao',
    'very_high': 'Nguy cơ rất cao',
}
_RISK_FROM_VN = {v: k for k, v in _RISK_TO_VN.items()}

_RISK_SCORE_ESTIMATE = {
    'low': 20.0,
    'medium': 45.0,
    'high': 72.0,
    'very_high': 88.0,
}


def _sex_to_vn(sex_int):
    return 'Nam' if int(sex_int) == 1 else 'Nữ'


def _sex_from_vn(gioi_tinh):
    return 1 if gioi_tinh == 'Nam' else 0


def _risk_level_to_vn(eng_level):
    return _RISK_TO_VN.get(eng_level, eng_level)


def _risk_level_from_vn(vn_level):
    return _RISK_FROM_VN.get(vn_level, vn_level)


# ================== DB helpers ==================

def _is_mssql_mode():
    mode = os.getenv('DB_MODE', 'mssql').strip().lower()
    return mode in ('mssql', 'sqlserver', 'sql_server')


def _normalize_email(email: str) -> str:
    return (email or '').strip().lower()


def _normalize_password(password: str) -> str:
    return (password or '').strip()


def _require_auth_mssql_mode():
    if not _is_mssql_mode():
        raise RuntimeError(
            'Xác thực tài khoản chỉ hỗ trợ SQL Server. '
            'Hãy đặt DB_MODE=mssql và cấu hình DB_SERVER/DB_NAME hoặc DB_CONNECTION_STRING.'
        )


def _resolve_mssql_driver():
    configured_driver = os.getenv('DB_DRIVER', '').strip()
    if configured_driver:
        return configured_driver

    if pyodbc is None:
        return 'ODBC Driver 17 for SQL Server'

    available_drivers = {d.strip() for d in pyodbc.drivers()}
    preferred = [
        'ODBC Driver 18 for SQL Server',
        'ODBC Driver 17 for SQL Server',
        'SQL Server'
    ]
    for candidate in preferred:
        if candidate in available_drivers:
            return candidate

    return 'ODBC Driver 17 for SQL Server'


def _fetchone_dict(conn, query, params=()):
    cur = conn.cursor()
    cur.execute(query, params)
    row = cur.fetchone()
    if row is None:
        return None
    cols = [c[0] for c in cur.description]
    return {cols[i]: row[i] for i in range(len(cols))}


def _fetchall_dict(conn, query, params=()):
    cur = conn.cursor()
    cur.execute(query, params)
    cols = [c[0] for c in cur.description]
    rows = cur.fetchall()
    return [{cols[i]: r[i] for i in range(len(cols))} for r in rows]


def _normalize_date_end(date_to):
    if not date_to:
        return None
    return date_to + ' 23:59:59'


def get_db():
    """Tạo kết nối database"""
    if _is_mssql_mode():
        if pyodbc is None:
            raise RuntimeError('Thiếu pyodbc. Hãy cài đặt: pip install pyodbc')

        explicit_conn_str = os.getenv('DB_CONNECTION_STRING', '').strip()
        if explicit_conn_str:
            try:
                return pyodbc.connect(explicit_conn_str, timeout=5)
            except Exception as e:
                raise RuntimeError(f'Không thể kết nối SQL Server bằng DB_CONNECTION_STRING: {e}')

        driver = _resolve_mssql_driver()
        server = os.getenv('DB_SERVER', 'DESKTOP-27VR937')
        database = os.getenv('DB_NAME', 'THONGTINNGUOIDUNG')
        port = os.getenv('DB_PORT', '').strip()
        server_target = f'{server},{port}' if port else server
        trusted = os.getenv('DB_TRUSTED', '1').lower() in ('1', 'true', 'yes')

        if trusted:
            conn_str = (
                f'DRIVER={{{driver}}};'
                f'SERVER={server_target};'
                f'DATABASE={database};'
                'Trusted_Connection=yes;'
                'TrustServerCertificate=yes;'
            )
        else:
            user = os.getenv('DB_USER', '')
            password = os.getenv('DB_PASSWORD', '')
            conn_str = (
                f'DRIVER={{{driver}}};'
                f'SERVER={server_target};'
                f'DATABASE={database};'
                f'UID={user};'
                f'PWD={password};'
                'TrustServerCertificate=yes;'
            )

        try:
            return pyodbc.connect(conn_str, timeout=5)
        except Exception as e:
            raise RuntimeError(
                f'Không thể kết nối SQL Server ({server_target}/{database}) với driver {driver}: {e}'
            )

    db_dir = os.path.dirname(DB_PATH)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_db_connection_info():
    """Lấy thông tin kết nối DB hiện tại để debug cấu hình deploy/runtime."""
    if not _is_mssql_mode():
        return {
            'server': 'local-file',
            'database': os.path.basename(DB_PATH),
            'loginUser': None,
            'mode': 'sqlite'
        }

    conn = get_db()
    try:
        row = _fetchone_dict(
            conn,
            'SELECT @@SERVERNAME AS ServerName, DB_NAME() AS DatabaseName, SYSTEM_USER AS LoginUser'
        )
        return {
            'server': row.get('ServerName') if row else None,
            'database': row.get('DatabaseName') if row else None,
            'loginUser': row.get('LoginUser') if row else None,
            'mode': 'mssql'
        }
    finally:
        conn.close()


def init_db():
    """Khởi tạo / cập nhật schema"""
    if _is_mssql_mode():
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            IF OBJECT_ID('dbo.TaiKhoan', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.TaiKhoan (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    HoTen NVARCHAR(100) NOT NULL,
                    Email NVARCHAR(150) NOT NULL UNIQUE,
                    MatKhau NVARCHAR(256) NOT NULL,
                    Role NVARCHAR(20) NOT NULL DEFAULT 'doctor',
                    NgayTao DATETIME2 NOT NULL DEFAULT GETDATE()
                )
            END
        """)
        # Thêm cột Role vào TaiKhoan nếu chưa có
        cur.execute("""
            IF OBJECT_ID('dbo.TaiKhoan', 'U') IS NOT NULL
               AND NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                               WHERE TABLE_NAME='TaiKhoan' AND COLUMN_NAME='Role')
            BEGIN
                ALTER TABLE TaiKhoan ADD Role NVARCHAR(20) NOT NULL DEFAULT 'doctor'
            END
        """)
        cur.execute("""
            IF OBJECT_ID('dbo.BenhNhan', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.BenhNhan (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    HoTen NVARCHAR(100) NULL,
                    Tuoi INT NOT NULL,
                    GioiTinh NVARCHAR(10) NOT NULL,
                    LoaiDauNguc INT NOT NULL,
                    HuyetApNghi FLOAT NOT NULL,
                    Cholesterol FLOAT NOT NULL,
                    DuongHuyetLucDoi INT NOT NULL,
                    KetQuaECG INT NOT NULL,
                    NhipTimToiDa FLOAT NOT NULL,
                    DauThatNgucKhiTap INT NOT NULL,
                    ST_Depression FLOAT NOT NULL,
                    DoDocST INT NOT NULL,
                    SoMachMauChinh INT NOT NULL,
                    Thalassemia INT NOT NULL,
                    KetQuaDuDoan NVARCHAR(50) NOT NULL,
                    RiskScore FLOAT NULL,
                    Prediction INT NULL,
                    NgayChanDoan DATETIME2 NOT NULL DEFAULT GETDATE(),
                    UserId INT NULL
                )
            END
        """)
        # Thêm cột RiskScore vào BenhNhan nếu chưa có
        cur.execute("""
            IF OBJECT_ID('dbo.BenhNhan', 'U') IS NOT NULL
               AND NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                               WHERE TABLE_NAME='BenhNhan' AND COLUMN_NAME='RiskScore')
            BEGIN
                ALTER TABLE BenhNhan ADD RiskScore FLOAT NULL
            END
        """)
        # Thêm cột Prediction vào BenhNhan nếu chưa có
        cur.execute("""
            IF OBJECT_ID('dbo.BenhNhan', 'U') IS NOT NULL
               AND NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                               WHERE TABLE_NAME='BenhNhan' AND COLUMN_NAME='Prediction')
            BEGIN
                ALTER TABLE BenhNhan ADD Prediction INT NULL
            END
        """)
        # Bảng AuditLog cho Phase 2 monitoring
        cur.execute("""
            IF OBJECT_ID('dbo.AuditLog', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.AuditLog (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    UserId INT NULL,
                    Action NVARCHAR(50) NOT NULL,
                    Endpoint NVARCHAR(200) NOT NULL,
                    IpAddress NVARCHAR(50) NULL,
                    LatencyMs FLOAT NULL,
                    HttpStatus INT NULL,
                    Detail NVARCHAR(500) NULL,
                    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE()
                )
            END
        """)
        conn.commit()
        conn.close()
        return

    # SQLite fallback
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS Users (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            FullName NVARCHAR(100) NOT NULL,
            Email NVARCHAR(150) NOT NULL UNIQUE,
            PasswordHash NVARCHAR(256) NOT NULL,
            Role VARCHAR(20) NOT NULL DEFAULT 'doctor',
            CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # Thêm cột Role nếu DB cũ chưa có (SQLite ALTER TABLE)
    try:
        conn.execute("ALTER TABLE Users ADD COLUMN Role VARCHAR(20) NOT NULL DEFAULT 'doctor'")
        conn.commit()
    except Exception:
        pass  # cột đã tồn tại

    conn.execute('''
        CREATE TABLE IF NOT EXISTS Diagnoses (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            UserId INTEGER NOT NULL,
            Age INTEGER NOT NULL,
            Sex INTEGER NOT NULL,
            Cp INTEGER NOT NULL,
            Trestbps REAL NOT NULL,
            Chol REAL NOT NULL,
            Fbs INTEGER NOT NULL,
            Restecg INTEGER NOT NULL,
            Thalach REAL NOT NULL,
            Exang INTEGER NOT NULL,
            Oldpeak REAL NOT NULL,
            Slope INTEGER NOT NULL,
            Ca INTEGER NOT NULL,
            Thal INTEGER NOT NULL,
            Prediction INTEGER NOT NULL,
            RiskScore REAL NOT NULL,
            RiskLevel VARCHAR(20) NOT NULL,
            CreatedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (UserId) REFERENCES Users(Id)
        )
    ''')
    # Bảng AuditLog cho Phase 2 monitoring
    conn.execute('''
        CREATE TABLE IF NOT EXISTS AuditLog (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            UserId INTEGER NULL,
            Action VARCHAR(50) NOT NULL,
            Endpoint VARCHAR(200) NOT NULL,
            IpAddress VARCHAR(50) NULL,
            LatencyMs REAL NULL,
            HttpStatus INTEGER NULL,
            Detail VARCHAR(500) NULL,
            CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()


# ==================== USER (TaiKhoan) ====================

class User:
    def __init__(self, id=None, full_name=None, email=None, password_hash=None, created_date=None, role='doctor'):
        self.id = id
        self.full_name = full_name
        self.email = email
        self.password_hash = password_hash
        self.created_date = created_date
        self.role = role

    @staticmethod
    def get_role(user_id: int) -> str:
        """Lấy role của user. Trả về 'doctor' nếu không tìm thấy."""
        try:
            conn = get_db()
            if _is_mssql_mode():
                row = _fetchone_dict(conn, "SELECT Role FROM dbo.TaiKhoan WHERE Id=?", (user_id,))
                conn.close()
                return (row.get('Role') or 'doctor') if row else 'doctor'
            else:
                row = _fetchone_dict(conn, "SELECT Role FROM Users WHERE Id=?", (user_id,))
                conn.close()
                return (row.get('Role') or 'doctor') if row else 'doctor'
        except Exception:
            return 'doctor'

    @staticmethod
    def get_all_users(limit: int = 100) -> list:
        """Lấy danh sách tất cả user (cho admin panel)."""
        try:
            conn = get_db()
            if _is_mssql_mode():
                rows = _fetchall_dict(conn, f"""
                    SELECT TOP {limit} Id, HoTen, Email, Role, NgayTao
                    FROM dbo.TaiKhoan ORDER BY NgayTao DESC
                """)
                conn.close()
                return [{'id': r['Id'], 'fullName': r['HoTen'], 'email': r['Email'],
                         'role': r.get('Role', 'doctor'), 'createdDate': str(r['NgayTao'])} for r in rows]
            else:
                rows = _fetchall_dict(conn, f"""
                    SELECT Id, FullName, Email, Role, CreatedDate
                    FROM Users ORDER BY CreatedDate DESC LIMIT {limit}
                """)
                conn.close()
                return [{'id': r['Id'], 'fullName': r['FullName'], 'email': r['Email'],
                         'role': r.get('Role', 'doctor'), 'createdDate': str(r['CreatedDate'])} for r in rows]
        except Exception:
            return []

    @staticmethod
    def update_role(user_id: int, new_role: str) -> bool:
        """Cập nhật role của user (chỉ admin)."""
        if new_role not in ('admin', 'doctor', 'nurse'):
            return False
        try:
            conn = get_db()
            if _is_mssql_mode():
                conn.cursor().execute("UPDATE dbo.TaiKhoan SET Role=? WHERE Id=?", (new_role, user_id))
            else:
                conn.execute("UPDATE Users SET Role=? WHERE Id=?", (new_role, user_id))
            conn.commit()
            conn.close()
            return True
        except Exception:
            return False

    @staticmethod
    def create(full_name: str, email: str, password: str):
        """Tạo user mới trong DB auth hiện tại."""
        full_name = (full_name or '').strip()
        email = _normalize_email(email)
        password = _normalize_password(password)

        conn = get_db()
        password_hash = generate_password_hash(password)
        try:
            if _is_mssql_mode():
                conn.execute(
                    'INSERT INTO TaiKhoan (HoTen, Email, MatKhau, NgayTao) VALUES (?, ?, ?, ?)',
                    (full_name, email, password_hash, datetime.now())
                )
            else:
                conn.execute(
                    'INSERT INTO Users (FullName, Email, PasswordHash, CreatedDate) VALUES (?, ?, ?, ?)',
                    (full_name, email, password_hash, datetime.now().isoformat())
                )
            conn.commit()
            return True, 'Đăng ký thành công'
        except Exception as e:
            message = str(e).lower()
            if 'unique' in message or 'duplicate' in message or '2627' in message or '2601' in message:
                return False, 'Email đã tồn tại'
            raise
        finally:
            conn.close()

    @staticmethod
    def find_by_email(email: str):
        """Tìm user theo email từ DB auth hiện tại."""
        normalized_email = _normalize_email(email)
        conn = get_db()
        try:
            if _is_mssql_mode():
                row = _fetchone_dict(
                    conn,
                    '''SELECT TOP 1 Id, HoTen, Email, MatKhau, NgayTao
                       FROM TaiKhoan
                       WHERE LOWER(LTRIM(RTRIM(Email))) = LOWER(LTRIM(RTRIM(?)))''',
                    (normalized_email,)
                )
            else:
                row = _fetchone_dict(
                    conn,
                    '''SELECT Id, FullName, Email, PasswordHash, CreatedDate
                       FROM Users
                       WHERE LOWER(TRIM(Email)) = LOWER(TRIM(?))
                       LIMIT 1''',
                    (normalized_email,)
                )
            if not row:
                return None

            return User(
                id=row['Id'],
                full_name=row.get('HoTen') or row.get('FullName'),
                email=row['Email'],
                password_hash=row.get('MatKhau') or row.get('PasswordHash'),
                created_date=row.get('NgayTao') or row.get('CreatedDate')
            )
        finally:
            conn.close()

    @staticmethod
    def verify_password(email: str, password: str):
        """
        Xác thực đăng nhập trực tiếp từ SQL Server.
        - Luôn truy vấn bảng TaiKhoan theo Email.
        - Ưu tiên xác thực mật khẩu hash.
        - Hỗ trợ dữ liệu plain text cũ và tự nâng cấp lên hash.
        """
        normalized_email = _normalize_email(email)
        normalized_password = _normalize_password(password)

        conn = get_db()
        try:
            if _is_mssql_mode():
                row = _fetchone_dict(
                    conn,
                    '''SELECT TOP 1 Id, HoTen, Email, MatKhau, NgayTao
                       FROM TaiKhoan
                       WHERE LOWER(LTRIM(RTRIM(Email))) = LOWER(LTRIM(RTRIM(?)))''',
                    (normalized_email,)
                )
            else:
                row = _fetchone_dict(
                    conn,
                    '''SELECT Id, FullName, Email, PasswordHash, CreatedDate
                       FROM Users
                       WHERE LOWER(TRIM(Email)) = LOWER(TRIM(?))
                       LIMIT 1''',
                    (normalized_email,)
                )

            if not row:
                return None

            stored = ((row.get('MatKhau') or row.get('PasswordHash')) or '').strip()
            is_match = False

            if stored.startswith('pbkdf2:') or stored.startswith('scrypt:'):
                is_match = check_password_hash(stored, normalized_password)
            else:
                # Dữ liệu cũ lưu plain text.
                is_match = stored == normalized_password
                if is_match and normalized_password:
                    new_hash = generate_password_hash(normalized_password)
                    if _is_mssql_mode():
                        conn.execute('UPDATE TaiKhoan SET MatKhau = ? WHERE Id = ?', (new_hash, row['Id']))
                    else:
                        conn.execute('UPDATE Users SET PasswordHash = ? WHERE Id = ?', (new_hash, row['Id']))
                    conn.commit()
                    if _is_mssql_mode():
                        row['MatKhau'] = new_hash
                    else:
                        row['PasswordHash'] = new_hash

            if not is_match:
                return None

            return User(
                id=row['Id'],
                full_name=row.get('HoTen') or row.get('FullName'),
                email=row['Email'],
                password_hash=row.get('MatKhau') or row.get('PasswordHash'),
                created_date=row.get('NgayTao') or row.get('CreatedDate')
            )
        finally:
            conn.close()

    @staticmethod
    def find_or_create_google(full_name: str, email: str, google_id: str):
        """Tìm hoặc tạo user đăng nhập qua Google."""
        email = _normalize_email(email)
        full_name = (full_name or '').strip() or email.split('@')[0]

        existing = User.find_by_email(email)
        if existing:
            return existing

        # Tạo user mới với placeholder password (không dùng để đăng nhập thường)
        conn = get_db()
        placeholder = generate_password_hash(f'GOOGLE_OAUTH:{google_id}:{datetime.now().isoformat()}')
        try:
            if _is_mssql_mode():
                conn.execute(
                    'INSERT INTO TaiKhoan (HoTen, Email, MatKhau, NgayTao) VALUES (?, ?, ?, ?)',
                    (full_name, email, placeholder, datetime.now())
                )
            else:
                conn.execute(
                    'INSERT INTO Users (FullName, Email, PasswordHash, CreatedDate) VALUES (?, ?, ?, ?)',
                    (full_name, email, placeholder, datetime.now().isoformat())
                )
            conn.commit()
        except Exception as e:
            message = str(e).lower()
            if 'unique' in message or 'duplicate' in message or '2627' in message or '2601' in message:
                return User.find_by_email(email)
            raise
        finally:
            conn.close()

        return User.find_by_email(email)

    @staticmethod
    def reset_password(email: str, new_password: str):
        """Đặt lại mật khẩu cho user theo email."""
        email = _normalize_email(email)
        new_password = _normalize_password(new_password)
        if not new_password or len(new_password) < 6:
            return False, 'Mật khẩu phải có ít nhất 6 ký tự'
        conn = get_db()
        try:
            if _is_mssql_mode():
                row = _fetchone_dict(conn,
                    '''SELECT TOP 1 Id FROM TaiKhoan
                       WHERE LOWER(LTRIM(RTRIM(Email))) = LOWER(LTRIM(RTRIM(?)))''',
                    (email,))
            else:
                row = _fetchone_dict(conn,
                    '''SELECT Id FROM Users
                       WHERE LOWER(TRIM(Email)) = LOWER(TRIM(?))
                       LIMIT 1''',
                    (email,))
            if not row:
                return False, 'Email không tồn tại trong hệ thống'
            new_hash = generate_password_hash(new_password)
            if _is_mssql_mode():
                conn.execute('UPDATE TaiKhoan SET MatKhau = ? WHERE Id = ?', (new_hash, row['Id']))
            else:
                conn.execute('UPDATE Users SET PasswordHash = ? WHERE Id = ?', (new_hash, row['Id']))
            conn.commit()
            return True, 'Đặt lại mật khẩu thành công'
        finally:
            conn.close()

    def to_dict(self):
        """Chuyển đổi thành dictionary (không bao gồm password)"""
        return {
            'id': self.id,
            'fullName': self.full_name,
            'email': self.email,
            'createdDate': self.created_date
        }


# ==================== DIAGNOSIS (BenhNhan) ====================

class Diagnosis:
    def __init__(self, **kwargs):
        self.id = kwargs.get('id')
        self.user_id = kwargs.get('user_id')
        self.age = kwargs.get('age')
        self.sex = kwargs.get('sex')
        self.cp = kwargs.get('cp')
        self.trestbps = kwargs.get('trestbps')
        self.chol = kwargs.get('chol')
        self.fbs = kwargs.get('fbs')
        self.restecg = kwargs.get('restecg')
        self.thalach = kwargs.get('thalach')
        self.exang = kwargs.get('exang')
        self.oldpeak = kwargs.get('oldpeak')
        self.slope = kwargs.get('slope')
        self.ca = kwargs.get('ca')
        self.thal = kwargs.get('thal')
        self.prediction = kwargs.get('prediction')
        self.risk_score = kwargs.get('risk_score')
        self.risk_level = kwargs.get('risk_level')
        self.created_date = kwargs.get('created_date')
        self.user_name = kwargs.get('user_name')

    @staticmethod
    def create(user_id, data, prediction, risk_score, risk_level):
        conn = get_db()
        try:
            cursor = conn.cursor()
            if _is_mssql_mode():
                # Lấy tên user từ TaiKhoan
                user_row = _fetchone_dict(conn, 'SELECT HoTen FROM TaiKhoan WHERE Id = ?', (user_id,))
                ho_ten = user_row['HoTen'] if user_row else None
                gioi_tinh = _sex_to_vn(data['sex'])
                ket_qua = _risk_level_to_vn(risk_level)
                cursor.execute(
                    '''INSERT INTO BenhNhan
                       (HoTen, Tuoi, GioiTinh, LoaiDauNguc, HuyetApNghi, Cholesterol,
                        DuongHuyetLucDoi, KetQuaECG, NhipTimToiDa, DauThatNgucKhiTap,
                        ST_Depression, DoDocST, SoMachMauChinh, Thalassemia,
                        KetQuaDuDoan, RiskScore, Prediction, NgayChanDoan, UserId)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                    (ho_ten, data['age'], gioi_tinh, data['cp'],
                     data['trestbps'], data['chol'], data['fbs'], data['restecg'],
                     data['thalach'], data['exang'], data['oldpeak'], data['slope'],
                     data['ca'], data['thal'], ket_qua, risk_score, prediction,
                     datetime.now(), user_id)
                )
                cursor.execute('SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId')
                row = cursor.fetchone()
                new_id = int(row[0]) if row and row[0] is not None else None
            else:
                cursor.execute(
                    '''INSERT INTO Diagnoses
                       (UserId, Age, Sex, Cp, Trestbps, Chol, Fbs, Restecg,
                        Thalach, Exang, Oldpeak, Slope, Ca, Thal,
                        Prediction, RiskScore, RiskLevel, CreatedDate)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                    (user_id, data['age'], data['sex'], data['cp'],
                     data['trestbps'], data['chol'], data['fbs'], data['restecg'],
                     data['thalach'], data['exang'], data['oldpeak'], data['slope'],
                     data['ca'], data['thal'], prediction, risk_score, risk_level,
                     datetime.now().isoformat())
                )
                new_id = cursor.lastrowid

            conn.commit()
            return new_id
        finally:
            conn.close()

    @staticmethod
    def get_all(limit=100, offset=0, risk_level=None, search=None):
        conn = get_db()
        if _is_mssql_mode():
            query = '''SELECT b.*, t.HoTen AS TenTaiKhoan
                       FROM BenhNhan b LEFT JOIN TaiKhoan t ON b.UserId = t.Id
                       WHERE 1=1'''
            params = []
            if risk_level and risk_level != 'all':
                vn_level = _risk_level_to_vn(risk_level)
                query += ' AND b.KetQuaDuDoan = ?'
                params.append(vn_level)
            if search:
                query += ' AND (b.HoTen LIKE ? OR CAST(b.Id AS NVARCHAR(50)) LIKE ?)'
                params.extend([f'%{search}%', f'%{search}%'])
            query += ' ORDER BY b.NgayChanDoan DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY'
            params.extend([offset, limit])
        else:
            query = '''SELECT d.*, u.FullName as UserName FROM Diagnoses d
                       LEFT JOIN Users u ON d.UserId = u.Id WHERE 1=1'''
            params = []
            if risk_level and risk_level != 'all':
                query += ' AND d.RiskLevel = ?'
                params.append(risk_level)
            if search:
                query += ' AND (u.FullName LIKE ? OR CAST(d.Id AS TEXT) LIKE ?)'
                params.extend([f'%{search}%', f'%{search}%'])
            query += ' ORDER BY d.CreatedDate DESC LIMIT ? OFFSET ?'
            params.extend([limit, offset])

        rows = _fetchall_dict(conn, query, tuple(params))
        conn.close()
        return [Diagnosis._from_row(r) for r in rows]

    @staticmethod
    def get_by_id(diagnosis_id):
        conn = get_db()
        if _is_mssql_mode():
            row = _fetchone_dict(conn,
                '''SELECT b.*, t.HoTen AS TenTaiKhoan
                   FROM BenhNhan b LEFT JOIN TaiKhoan t ON b.UserId = t.Id
                   WHERE b.Id = ?''', (diagnosis_id,))
        else:
            row = _fetchone_dict(conn,
                '''SELECT d.*, u.FullName as UserName FROM Diagnoses d
                   LEFT JOIN Users u ON d.UserId = u.Id WHERE d.Id = ?''',
                (diagnosis_id,))
        conn.close()
        return Diagnosis._from_row(row) if row else None

    @staticmethod
    def get_by_user(user_id, limit=50):
        conn = get_db()
        if _is_mssql_mode():
            query = '''SELECT b.*, t.HoTen AS TenTaiKhoan
                       FROM BenhNhan b LEFT JOIN TaiKhoan t ON b.UserId = t.Id
                       WHERE b.UserId = ?
                       ORDER BY b.NgayChanDoan DESC OFFSET 0 ROWS FETCH NEXT ? ROWS ONLY'''
        else:
            query = '''SELECT d.*, u.FullName as UserName FROM Diagnoses d
                       LEFT JOIN Users u ON d.UserId = u.Id
                       WHERE d.UserId = ? ORDER BY d.CreatedDate DESC LIMIT ?'''
        rows = _fetchall_dict(conn, query, (user_id, limit))
        conn.close()
        return [Diagnosis._from_row(r) for r in rows]

    @staticmethod
    def get_stats(user_id=None):
        conn = get_db()
        if _is_mssql_mode():
            where = ' WHERE 1=1'
            params = []
            if user_id is not None:
                where += ' AND UserId = ?'
                params.append(user_id)

            total = _fetchone_dict(conn, f'SELECT COUNT(*) as c FROM BenhNhan{where}', tuple(params))['c']
            high = _fetchone_dict(conn,
                f"SELECT COUNT(*) as c FROM BenhNhan{where} AND KetQuaDuDoan IN (N'Nguy cơ cao', N'Nguy cơ rất cao')",
                tuple(params))['c']
            medium = _fetchone_dict(conn,
                f"SELECT COUNT(*) as c FROM BenhNhan{where} AND KetQuaDuDoan = N'Nguy cơ trung bình'",
                tuple(params))['c']
            low = _fetchone_dict(conn,
                f"SELECT COUNT(*) as c FROM BenhNhan{where} AND KetQuaDuDoan = N'Nguy cơ thấp'",
                tuple(params))['c']

            recent_query = '''SELECT b.*, t.HoTen AS TenTaiKhoan
                              FROM BenhNhan b LEFT JOIN TaiKhoan t ON b.UserId = t.Id
                              WHERE 1=1'''
            daily_query = '''SELECT CAST(NgayChanDoan AS date) as day, COUNT(*) as count
                             FROM BenhNhan
                             WHERE NgayChanDoan >= DATEADD(day, -30, CAST(GETDATE() AS date))'''
            query_params = list(params)
            if user_id is not None:
                recent_query += ' AND b.UserId = ?'
                daily_query += ' AND UserId = ?'
            recent_query += ' ORDER BY b.NgayChanDoan DESC OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY'
            daily_query += ' GROUP BY CAST(NgayChanDoan AS date) ORDER BY day'
        else:
            where = ' WHERE 1=1'
            params = []
            if user_id is not None:
                where += ' AND UserId = ?'
                params.append(user_id)

            total = _fetchone_dict(conn, f'SELECT COUNT(*) as c FROM Diagnoses{where}', tuple(params))['c']
            high = _fetchone_dict(conn, f"SELECT COUNT(*) as c FROM Diagnoses{where} AND RiskLevel IN ('high','very_high')", tuple(params))['c']
            medium = _fetchone_dict(conn, f"SELECT COUNT(*) as c FROM Diagnoses{where} AND RiskLevel='medium'", tuple(params))['c']
            low = _fetchone_dict(conn, f"SELECT COUNT(*) as c FROM Diagnoses{where} AND RiskLevel='low'", tuple(params))['c']

            recent_query = '''SELECT d.*, u.FullName as UserName FROM Diagnoses d
                              LEFT JOIN Users u ON d.UserId = u.Id WHERE 1=1'''
            daily_query = '''SELECT DATE(CreatedDate) as day, COUNT(*) as count
                             FROM Diagnoses
                             WHERE CreatedDate >= DATE('now', '-30 days')'''
            query_params = list(params)
            if user_id is not None:
                recent_query += ' AND d.UserId = ?'
                daily_query += ' AND UserId = ?'
            recent_query += ' ORDER BY d.CreatedDate DESC LIMIT 5'
            daily_query += ' GROUP BY DATE(CreatedDate) ORDER BY day'

        recent = _fetchall_dict(conn, recent_query, tuple(query_params))
        daily = _fetchall_dict(conn, daily_query, tuple(query_params))
        conn.close()
        return {
            'total': total, 'high': high, 'medium': medium, 'low': low,
            'recent': [Diagnosis._from_row(r).to_dict() for r in recent],
            'daily': [{'date': r['day'], 'count': r['count']} for r in daily]
        }

    @staticmethod
    def get_report_stats(date_from=None, date_to=None, user_id=None):
        conn = get_db()

        if _is_mssql_mode():
            # ---- SQL Server: bảng BenhNhan ----
            where = ''
            params = []
            if user_id is not None:
                where += " AND UserId = ?"
                params.append(user_id)
            if date_from:
                where += " AND NgayChanDoan >= ?"
                params.append(date_from)
            if date_to:
                where += " AND NgayChanDoan <= ?"
                params.append(_normalize_date_end(date_to))

            total = _fetchone_dict(conn,
                f'SELECT COUNT(*) as c FROM BenhNhan WHERE 1=1{where}', tuple(params))['c']
            total_users = _fetchone_dict(conn,
                f'SELECT COUNT(DISTINCT UserId) as c FROM BenhNhan WHERE 1=1{where}', tuple(params))['c']

            by_risk_raw = _fetchall_dict(conn,
                f'''SELECT KetQuaDuDoan, COUNT(*) as count FROM BenhNhan WHERE 1=1{where}
                    GROUP BY KetQuaDuDoan''', tuple(params))
            by_risk = [{'level': _risk_level_from_vn(r['KetQuaDuDoan']), 'count': r['count']}
                       for r in by_risk_raw]

            age_case = """
                CASE
                  WHEN Tuoi < 30 THEN '< 30'
                  WHEN Tuoi BETWEEN 30 AND 39 THEN '30-39'
                  WHEN Tuoi BETWEEN 40 AND 49 THEN '40-49'
                  WHEN Tuoi BETWEEN 50 AND 59 THEN '50-59'
                  WHEN Tuoi BETWEEN 60 AND 69 THEN '60-69'
                  ELSE '70+'
                END"""
            by_age = _fetchall_dict(conn,
                f'''SELECT {age_case} as age_group, COUNT(*) as count,
                    AVG(ISNULL(RiskScore, 50.0)) as avg_risk
                    FROM BenhNhan WHERE 1=1{where}
                    GROUP BY {age_case} ORDER BY age_group''', tuple(params))

            by_sex_raw = _fetchall_dict(conn,
                f'''SELECT GioiTinh, COUNT(*) as count,
                    AVG(ISNULL(RiskScore, 50.0)) as avg_risk
                    FROM BenhNhan WHERE 1=1{where}
                    GROUP BY GioiTinh''', tuple(params))
            by_sex = [{'sex': _sex_from_vn(r['GioiTinh']), 'count': r['count'],
                       'avg_risk': round(r['avg_risk'], 1)} for r in by_sex_raw]

            monthly_expr = "CONVERT(char(7), NgayChanDoan, 126)"
            monthly = _fetchall_dict(conn,
                f'''SELECT {monthly_expr} as month, COUNT(*) as count
                    FROM BenhNhan WHERE 1=1{where}
                    GROUP BY {monthly_expr} ORDER BY month''', tuple(params))

            recent_rows = _fetchall_dict(conn,
                f'''SELECT b.Id, b.UserId, t.HoTen, b.Tuoi, b.GioiTinh,
                       b.KetQuaDuDoan, b.RiskScore, b.NgayChanDoan
                    FROM BenhNhan b LEFT JOIN TaiKhoan t ON b.UserId = t.Id
                    WHERE 1=1{where}
                    ORDER BY b.NgayChanDoan DESC
                    OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY''', tuple(params))
            recent_records = [{
                'id': r['Id'], 'userId': r['UserId'],
                'userName': r.get('HoTen', ''),
                'age': r['Tuoi'],
                'sex': _sex_from_vn(r.get('GioiTinh', 'Nam')),
                'riskLevel': _risk_level_from_vn(r.get('KetQuaDuDoan', '')),
                'riskScore': r.get('RiskScore'),
                'createdDate': r.get('NgayChanDoan'),
            } for r in recent_rows]

            conn.close()
            return {
                'total_diagnoses': total,
                'total_users': total_users,
                'by_risk': by_risk,
                'by_age': [{'group': r['age_group'], 'count': r['count'],
                            'avg_risk': round(r['avg_risk'], 1)} for r in by_age],
                'by_sex': by_sex,
                'monthly': [{'month': r['month'], 'count': r['count']} for r in monthly],
                'recent_records': recent_records,
            }

        # ---- SQLite fallback ----
        where = ''
        params = []
        if user_id is not None:
            where += " AND UserId = ?"
            params.append(user_id)
        if date_from:
            where += " AND CreatedDate >= ?"
            params.append(date_from)
        if date_to:
            where += " AND CreatedDate <= ?"
            params.append(_normalize_date_end(date_to))

        total = _fetchone_dict(conn, f'SELECT COUNT(*) as c FROM Diagnoses WHERE 1=1{where}', tuple(params))['c']
        total_users = _fetchone_dict(conn, f'SELECT COUNT(DISTINCT UserId) as c FROM Diagnoses WHERE 1=1{where}', tuple(params))['c']

        by_risk = _fetchall_dict(conn,
            f'''SELECT RiskLevel, COUNT(*) as count FROM Diagnoses WHERE 1=1{where}
                GROUP BY RiskLevel''', tuple(params))

        by_age = _fetchall_dict(conn,
            f'''SELECT
                CASE
                  WHEN Age < 30 THEN '< 30'
                  WHEN Age BETWEEN 30 AND 39 THEN '30-39'
                  WHEN Age BETWEEN 40 AND 49 THEN '40-49'
                  WHEN Age BETWEEN 50 AND 59 THEN '50-59'
                  WHEN Age BETWEEN 60 AND 69 THEN '60-69'
                  ELSE '70+'
                END as age_group,
                COUNT(*) as count,
                AVG(RiskScore) as avg_risk
                FROM Diagnoses WHERE 1=1{where}
                GROUP BY age_group ORDER BY age_group''', tuple(params))

        by_sex = _fetchall_dict(conn,
            f'''SELECT Sex, COUNT(*) as count, AVG(RiskScore) as avg_risk
                FROM Diagnoses WHERE 1=1{where}
                GROUP BY Sex''', tuple(params))

        monthly = _fetchall_dict(conn,
            f'''SELECT strftime('%Y-%m', CreatedDate) as month, COUNT(*) as count
                FROM Diagnoses WHERE 1=1{where}
                GROUP BY strftime('%Y-%m', CreatedDate) ORDER BY month''', tuple(params))

        recent_rows = _fetchall_dict(conn,
            f'''SELECT d.Id, d.UserId, u.FullName as UserName, d.Age, d.Sex,
                   d.RiskLevel, d.RiskScore, d.CreatedDate
                FROM Diagnoses d LEFT JOIN Users u ON d.UserId = u.Id
                WHERE 1=1{where}
                ORDER BY d.CreatedDate DESC LIMIT 50''', tuple(params))
        recent_records = [{
            'id': r['Id'], 'userId': r['UserId'],
            'userName': r.get('UserName', ''),
            'age': r['Age'], 'sex': r['Sex'],
            'riskLevel': r['RiskLevel'],
            'riskScore': r.get('RiskScore'),
            'createdDate': r.get('CreatedDate'),
        } for r in recent_rows]

        conn.close()
        return {
            'total_diagnoses': total,
            'total_users': total_users,
            'by_risk': [{'level': r['RiskLevel'], 'count': r['count']} for r in by_risk],
            'by_age': [{'group': r['age_group'], 'count': r['count'], 'avg_risk': round(r['avg_risk'], 1)} for r in by_age],
            'by_sex': [{'sex': r['Sex'], 'count': r['count'], 'avg_risk': round(r['avg_risk'], 1)} for r in by_sex],
            'monthly': [{'month': r['month'], 'count': r['count']} for r in monthly],
            'recent_records': recent_records,
        }

    @staticmethod
    def _from_row(row):
        if not row:
            return None

        if _is_mssql_mode():
            # BenhNhan columns -> Diagnosis attributes
            ket_qua = row.get('KetQuaDuDoan', '')
            risk_level = _risk_level_from_vn(ket_qua) if ket_qua else 'low'
            risk_score = row.get('RiskScore')
            if risk_score is None:
                risk_score = _RISK_SCORE_ESTIMATE.get(risk_level, 30.0)
            prediction = row.get('Prediction')
            if prediction is None:
                prediction = 1 if risk_level in ('high', 'very_high') else 0

            return Diagnosis(
                id=row.get('Id'),
                user_id=row.get('UserId'),
                age=row.get('Tuoi'),
                sex=_sex_from_vn(row.get('GioiTinh', 'Nam')),
                cp=row.get('LoaiDauNguc'),
                trestbps=row.get('HuyetApNghi'),
                chol=row.get('Cholesterol'),
                fbs=int(row.get('DuongHuyetLucDoi') or 0),
                restecg=row.get('KetQuaECG'),
                thalach=row.get('NhipTimToiDa'),
                exang=int(row.get('DauThatNgucKhiTap') or 0),
                oldpeak=row.get('ST_Depression'),
                slope=row.get('DoDocST'),
                ca=row.get('SoMachMauChinh'),
                thal=row.get('Thalassemia'),
                prediction=prediction,
                risk_score=risk_score,
                risk_level=risk_level,
                created_date=row.get('NgayChanDoan'),
                user_name=row.get('HoTen') or row.get('TenTaiKhoan')
            )

        # SQLite fallback
        return Diagnosis(
            id=row.get('Id'), user_id=row.get('UserId'),
            age=row.get('Age'), sex=row.get('Sex'), cp=row.get('Cp'),
            trestbps=row.get('Trestbps'), chol=row.get('Chol'),
            fbs=row.get('Fbs'), restecg=row.get('Restecg'),
            thalach=row.get('Thalach'), exang=row.get('Exang'),
            oldpeak=row.get('Oldpeak'), slope=row.get('Slope'),
            ca=row.get('Ca'), thal=row.get('Thal'),
            prediction=row.get('Prediction'), risk_score=row.get('RiskScore'),
            risk_level=row.get('RiskLevel'), created_date=row.get('CreatedDate'),
            user_name=row.get('UserName')
        )

    def to_dict(self):
        return {
            'id': self.id, 'userId': self.user_id, 'userName': self.user_name,
            'age': self.age, 'sex': self.sex, 'cp': self.cp,
            'trestbps': self.trestbps, 'chol': self.chol,
            'fbs': self.fbs, 'restecg': self.restecg,
            'thalach': self.thalach, 'exang': self.exang,
            'oldpeak': self.oldpeak, 'slope': self.slope,
            'ca': self.ca, 'thal': self.thal,
            'prediction': self.prediction, 'riskScore': self.risk_score,
            'riskLevel': self.risk_level, 'createdDate': self.created_date
        }

    @staticmethod
    def get_risk_distribution(days: int = 7) -> list:
        """
        Thống kê phân phối risk_score trong N ngày gần nhất.
        Dùng cho drift monitor Phase 2.
        Trả về list dict: [{date, low, medium, high, very_high, avg_score, count}]
        """
        conn = get_db()
        try:
            if _is_mssql_mode():
                rows = _fetchall_dict(conn, f"""
                    SELECT
                        CAST(NgayChanDoan AS DATE) AS day,
                        KetQuaDuDoan AS risk_level,
                        RiskScore AS risk_score
                    FROM dbo.BenhNhan
                    WHERE NgayChanDoan >= DATEADD(day, -{days}, GETDATE())
                      AND RiskScore IS NOT NULL
                    ORDER BY day
                """)
            else:
                rows = _fetchall_dict(conn, f"""
                    SELECT
                        DATE(CreatedDate) AS day,
                        RiskLevel AS risk_level,
                        RiskScore AS risk_score
                    FROM Diagnoses
                    WHERE CreatedDate >= DATE('now', '-{days} days')
                      AND RiskScore IS NOT NULL
                    ORDER BY day
                """)
        finally:
            conn.close()

        # Tổng hợp theo ngày
        from collections import defaultdict
        by_day = defaultdict(lambda: {'low': 0, 'medium': 0, 'high': 0, 'very_high': 0,
                                       'scores': [], 'count': 0})
        for r in rows:
            day = str(r.get('day', ''))[:10]
            raw_level = str(r.get('risk_level', '')).strip()
            level = _risk_level_from_vn(raw_level) if raw_level in _RISK_FROM_VN else raw_level
            if level not in ('low', 'medium', 'high', 'very_high'):
                level = 'medium'
            score = r.get('risk_score')
            bucket = by_day[day]
            bucket[level] = bucket[level] + 1
            bucket['count'] = bucket['count'] + 1
            if score is not None:
                bucket['scores'].append(float(score))

        result = []
        for day in sorted(by_day.keys()):
            b = by_day[day]
            avg = sum(b['scores']) / len(b['scores']) if b['scores'] else 0
            result.append({
                'date': day,
                'low': b['low'], 'medium': b['medium'],
                'high': b['high'], 'very_high': b['very_high'],
                'count': b['count'],
                'avg_score': round(avg, 1),
            })
        return result


# ==================== AUDIT LOG (Phase 2) ====================

class AuditLog:
    """Ghi lại audit trail của các request quan trọng."""

    @staticmethod
    def create(user_id=None, action: str = 'api_call', endpoint: str = '',
               ip_address: str = None, latency_ms: float = None,
               http_status: int = None, detail: str = None):
        """Ghi một bản ghi audit vào DB."""
        try:
            conn = get_db()
            if _is_mssql_mode():
                conn.cursor().execute("""
                    INSERT INTO dbo.AuditLog
                        (UserId, Action, Endpoint, IpAddress, LatencyMs, HttpStatus, Detail)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (user_id, action[:50], endpoint[:200],
                      (ip_address or '')[:50], latency_ms, http_status,
                      (detail or '')[:500]))
            else:
                conn.execute("""
                    INSERT INTO AuditLog
                        (UserId, Action, Endpoint, IpAddress, LatencyMs, HttpStatus, Detail)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (user_id, action[:50], endpoint[:200],
                      (ip_address or '')[:50], latency_ms, http_status,
                      (detail or '')[:500]))
            conn.commit()
            conn.close()
        except Exception:
            pass  # Audit log không được làm crash request chính

    @staticmethod
    def get_recent(limit: int = 50) -> list:
        """Lấy N bản ghi audit gần nhất."""
        try:
            conn = get_db()
            if _is_mssql_mode():
                rows = _fetchall_dict(conn, f"""
                    SELECT TOP {limit}
                        a.Id, a.UserId, a.Action, a.Endpoint,
                        a.IpAddress, a.LatencyMs, a.HttpStatus, a.Detail,
                        a.CreatedAt,
                        t.HoTen AS UserName
                    FROM dbo.AuditLog a
                    LEFT JOIN dbo.TaiKhoan t ON a.UserId = t.Id
                    ORDER BY a.CreatedAt DESC
                """)
            else:
                rows = _fetchall_dict(conn, """
                    SELECT a.Id, a.UserId, a.Action, a.Endpoint,
                           a.IpAddress, a.LatencyMs, a.HttpStatus, a.Detail,
                           a.CreatedAt,
                           u.FullName AS UserName
                    FROM AuditLog a
                    LEFT JOIN Users u ON a.UserId = u.Id
                    ORDER BY a.CreatedAt DESC
                    LIMIT ?
                """, (limit,))
            conn.close()
            return [{
                'id': r.get('Id'),
                'userId': r.get('UserId'),
                'userName': r.get('UserName') or 'Hệ thống',
                'action': r.get('Action'),
                'endpoint': r.get('Endpoint'),
                'ipAddress': r.get('IpAddress'),
                'latencyMs': r.get('LatencyMs'),
                'httpStatus': r.get('HttpStatus'),
                'detail': r.get('Detail'),
                'createdAt': str(r.get('CreatedAt', '')),
            } for r in rows]
        except Exception:
            return []


# Hướng dẫn Upload Folder lên Repository / Guide to Upload Folders to Repository

## Tiếng Việt

### Cách 1: Sử dụng Git Command Line (Khuyến nghị)

#### Bước 1: Cài đặt Git
- Tải và cài đặt Git từ [git-scm.com](https://git-scm.com/)
- Kiểm tra cài đặt bằng lệnh: `git --version`

#### Bước 2: Clone Repository
```bash
git clone https://github.com/dongmino042/Gen-data-TL.git
cd Gen-data-TL
```

#### Bước 3: Sao chép folder của bạn vào thư mục repository
- Copy/paste folder bạn muốn upload vào thư mục `Gen-data-TL`
- Ví dụ: Nếu bạn có folder `data`, copy nó vào `Gen-data-TL/data`

#### Bước 4: Add, Commit và Push
```bash
# Thêm tất cả files
git add .

# Hoặc thêm một folder cụ thể
git add ten-folder/

# Commit với message mô tả
git commit -m "Thêm dữ liệu mới"

# Push lên GitHub
git push origin main
```

#### Lưu ý quan trọng:
- Nếu lần đầu tiên push, có thể cần cấu hình:
```bash
git config --global user.name "Tên của bạn"
git config --global user.email "email@example.com"
```
- Nếu nhánh chính là `master` thay vì `main`, dùng: `git push origin master`

### Cách 2: Sử dụng GitHub Web Interface

#### Cho files nhỏ hơn 25MB:
1. Truy cập repository trên GitHub: https://github.com/dongmino042/Gen-data-TL
2. Click nút **Add file** → **Upload files**
3. Kéo và thả folder của bạn vào (hoặc click **choose your files**)
4. Thêm commit message
5. Click **Commit changes**

**Lưu ý:** Phương pháp này có giới hạn:
- Mỗi file không quá 25MB
- Không upload được quá 100 files cùng lúc
- Không giữ được cấu trúc folder rỗng

### Cách 3: Sử dụng GitHub Desktop (Dễ dùng nhất)

1. Tải và cài đặt [GitHub Desktop](https://desktop.github.com/)
2. Clone repository:
   - File → Clone Repository
   - Chọn `dongmino042/Gen-data-TL`
3. Mở folder local:
   - Repository → Show in Explorer (Windows) / Finder (Mac)
4. Copy folder của bạn vào thư mục repository
5. GitHub Desktop sẽ tự động phát hiện thay đổi
6. Thêm commit message và click **Commit to main**
7. Click **Push origin** để upload

---

## English

### Method 1: Using Git Command Line (Recommended)

#### Step 1: Install Git
- Download and install Git from [git-scm.com](https://git-scm.com/)
- Verify installation: `git --version`

#### Step 2: Clone the Repository
```bash
git clone https://github.com/dongmino042/Gen-data-TL.git
cd Gen-data-TL
```

#### Step 3: Copy your folder into the repository directory
- Copy/paste the folder you want to upload into the `Gen-data-TL` directory
- Example: If you have a `data` folder, copy it to `Gen-data-TL/data`

#### Step 4: Add, Commit, and Push
```bash
# Add all files
git add .

# Or add a specific folder
git add folder-name/

# Commit with a descriptive message
git commit -m "Add new data"

# Push to GitHub
git push origin main
```

#### Important notes:
- First time setup may require configuration:
```bash
git config --global user.name "Your Name"
git config --global user.email "email@example.com"
```
- If the main branch is `master` instead of `main`, use: `git push origin master`

### Method 2: Using GitHub Web Interface

#### For files smaller than 25MB:
1. Go to the repository on GitHub: https://github.com/dongmino042/Gen-data-TL
2. Click **Add file** → **Upload files**
3. Drag and drop your folder (or click **choose your files**)
4. Add a commit message
5. Click **Commit changes**

**Note:** This method has limitations:
- Each file must be under 25MB
- Cannot upload more than 100 files at once
- Empty folders are not preserved

### Method 3: Using GitHub Desktop (Easiest)

1. Download and install [GitHub Desktop](https://desktop.github.com/)
2. Clone the repository:
   - File → Clone Repository
   - Select `dongmino042/Gen-data-TL`
3. Open local folder:
   - Repository → Show in Explorer (Windows) / Finder (Mac)
4. Copy your folder into the repository directory
5. GitHub Desktop will automatically detect changes
6. Add a commit message and click **Commit to main**
7. Click **Push origin** to upload

---

## Xử lý các vấn đề thường gặp / Troubleshooting

### File quá lớn (Large Files)
**Vấn đề:** GitHub giới hạn file đơn ở 100MB

**Giải pháp:**
1. Sử dụng Git LFS (Large File Storage):
```bash
git lfs install
git lfs track "*.zip"
git lfs track "*.rar"
git add .gitattributes
git add ten-file-lon
git commit -m "Add large files with LFS"
git push
```

2. Hoặc chia nhỏ file/nén file lại

### Bị từ chối khi push (Push Rejected)
**Vấn đề:** `! [rejected] main -> main (fetch first)`

**Giải pháp:**
```bash
git pull origin main
# Giải quyết conflicts nếu có
git push origin main
```

### Authentication Failed
**Giải pháp:** Sử dụng Personal Access Token thay vì password:
1. Vào GitHub Settings → Developer settings → Personal access tokens
2. Tạo token mới với quyền `repo`
3. Sử dụng token làm password khi push

---

## Best Practices / Thực hành tốt nhất

### Files không nên upload:
- `node_modules/` (dependencies)
- `.env` (environment variables - chứa thông tin nhạy cảm)
- Build artifacts (`dist/`, `build/`, `*.pyc`)
- IDE settings (`.vscode/`, `.idea/`)
- OS files (`.DS_Store`, `Thumbs.db`)

### Sử dụng .gitignore
Tạo file `.gitignore` để tự động bỏ qua các files không cần thiết:
```
# Dependencies
node_modules/
venv/
__pycache__/

# Environment variables
.env
.env.local

# Build outputs
dist/
build/
*.pyc

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db
```

### Commit message nên rõ ràng:
- ✅ "Thêm dữ liệu training cho model NLP"
- ✅ "Add training data for NLP model"
- ❌ "Update"
- ❌ "abc"

---

## Liên kết hữu ích / Useful Links

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Docs](https://docs.github.com/)
- [GitHub Desktop](https://desktop.github.com/)
- [Git LFS](https://git-lfs.github.com/)

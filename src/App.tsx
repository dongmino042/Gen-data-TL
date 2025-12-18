import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import './App.css'

interface InventoryRow {
  maHang: string;
  maMau: string;
  mauChiTiet: string;
  size: string;
  namGop: string;
  tonHienTai: number;
}

interface StoreRow extends InventoryRow {
  storeId: string;
  storeName: string;
}

function App() {
  const [numProducts, setNumProducts] = useState<number>(10);
  const [numProductsInput, setNumProductsInput] = useState<string>('10');
  const [colorsPerProduct, setColorsPerProduct] = useState<number>(4);
  const [sizesPerColor, setSizesPerColor] = useState<number>(3);
  const [generatedData, setGeneratedData] = useState<InventoryRow[]>([]);
  const [storeCount, setStoreCount] = useState<number>(5);
  const [storeCountInput, setStoreCountInput] = useState<string>('5');
  const [storeSkuMax, setStoreSkuMax] = useState<number>(30);
  const [storeSkuMaxInput, setStoreSkuMaxInput] = useState<string>('30');
  const [storeData, setStoreData] = useState<StoreRow[]>([]);
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [editValue, setEditValue] = useState<string>(String(numProducts));
  const [editColorValue, setEditColorValue] = useState<string>('4');
  const [editSizeValue, setEditSizeValue] = useState<string>('3');
  const [editSkuInline, setEditSkuInline] = useState<boolean>(false);
  const [uploadedData, setUploadedData] = useState<InventoryRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colors = [
    { code: 'Đo', name: 'Đỏ' },
    { code: 'Hong', name: 'Hồng' },
    { code: 'Vang', name: 'Vàng' },
    { code: 'Trang', name: 'Trắng' },
    { code: 'Xanh', name: 'Xanh' },
    { code: 'Tim', name: 'Tím' },
    { code: 'Cam', name: 'Cam' },
    { code: 'Đen', name: 'Đen' },
  ];

  const sizePool = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
  const sizes = sizePool.slice(0, Math.max(1, Math.min(sizePool.length, sizesPerColor)));
  const years = ['2024', '2023', 'trước 2023'];

  const storeCities = ['Hà Nội', 'Hải Phòng', 'Đà Nẵng', 'Nha Trang', 'Hồ Chí Minh', 'Cần Thơ', 'Biên Hòa', 'Bình Dương', 'Hạ Long', 'Vinh', 'Huế'];
  const storePrefixes = ['TokyoLife', 'TL Mart', 'TL Fashion', 'TokyoLite'];

  const generateData = () => {
    const data: InventoryRow[] = [];
    
    const productsToGenerate = Math.max(1, Math.round(numProducts));

    for (let i = 0; i < productsToGenerate; i++) {
      const maHang = `${5000000 + i}`;
      
      // Chọn màu ngẫu nhiên cho sản phẩm này
      const shuffledColors = [...colors].sort(() => Math.random() - 0.5);
      const selectedColors = shuffledColors.slice(0, colorsPerProduct);

      selectedColors.forEach(color => {
        const maMau = `${maHang}${color.code}`;
        
        // Tạo size cho mỗi màu
        sizes.forEach(size => {
          const year = years[Math.floor(Math.random() * years.length)];
          const tonHienTai = Math.floor(Math.random() * 101); // 0-100

          data.push({
            maHang,
            maMau,
            mauChiTiet: color.name,
            size,
            namGop: year,
            tonHienTai
          });
        });
      });
    }

    setGeneratedData(data);
  };

  const applyInlineEdit = () => {
    const parsed = parseInt(editValue, 10);
    const sanitized = Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : numProducts;
    setNumProducts(sanitized);
    setNumProductsInput(String(sanitized));
    setEditSkuInline(false);
  };

  const cancelInlineEdit = () => {
    setEditValue(String(numProducts));
    setEditSkuInline(false);
  };

  const updateColorValue = (val: string) => {
    setEditColorValue(val);
    const parsed = parseInt(val, 10);
    if (Number.isFinite(parsed)) {
      const sanitized = Math.max(1, Math.min(colors.length, Math.round(parsed)));
      setColorsPerProduct(sanitized);
    }
  };

  const updateSizeValue = (val: string) => {
    setEditSizeValue(val);
    const parsed = parseInt(val, 10);
    if (Number.isFinite(parsed)) {
      const sanitized = Math.max(1, Math.min(sizePool.length, Math.round(parsed)));
      setSizesPerColor(sanitized);
    }
  };

  const exportToCSV = () => {
    const headers = ['Mã hàng', 'Mã màu', 'Màu chi tiết', 'Size', 'Năm gộp', 'Tồn hiện tại'];
    const csvContent = [
      headers.join(','),
      ...generatedData.map(row => 
        `${row.maHang},${row.maMau},${row.mauChiTiet},${row.size},${row.namGop},${row.tonHienTai}`
      )
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Tồn_Kho_Tổng.csv';
    link.click();
  };

  const makeStoreName = (idx: number) => {
    const prefix = storePrefixes[idx % storePrefixes.length];
    const city = storeCities[idx % storeCities.length];
    const branch = idx + 1;
    return `${prefix} ${city} ${branch}`;
  };

  const generateStoreData = () => {
    const rows: StoreRow[] = [];
    const maxPerStore = Math.min(30, Math.max(1, storeSkuMax));
    const productsBase = 6000000;

    for (let i = 0; i < storeCount; i++) {
      const storeId = `CH-${String(i + 1).padStart(3, '0')}`;
      const storeName = makeStoreName(i);
      // Random SKU count từ 1 đến maxPerStore cho mỗi cửa hàng
      const skuCount = Math.floor(Math.random() * maxPerStore) + 1;

      for (let j = 0; j < skuCount; j++) {
        const maHang = `${productsBase + i * 100 + j}`;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = sizes[Math.floor(Math.random() * sizes.length)];
        const maMau = `${maHang}${color.code}`;
        const year = years[Math.floor(Math.random() * years.length)];
        const tonHienTai = Math.floor(Math.random() * 51); // 0-50 per store

        rows.push({
          storeId,
          storeName,
          maHang,
          maMau,
          mauChiTiet: color.name,
          size,
          namGop: year,
          tonHienTai
        });
      }
    }

    setStoreData(rows);
    setSelectedStores(new Set(rows.map(r => r.storeId).filter((v, i, a) => a.indexOf(v) === i)));
  };

  const exportStoreCSV = () => {
    const filteredData = storeData.filter(row => selectedStores.has(row.storeId));
    const headers = ['Mã hàng', 'Mã màu', 'Màu chi tiết', 'Size', 'Năm gộp', 'Tồn hiện tại'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row =>
        `${row.maHang},${row.maMau},${row.mauChiTiet},${row.size},${row.namGop},${row.tonHienTai}`
      )
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Ton_Cua_Hang.csv';
    link.click();
  };

  const exportStoresAsExcel = () => {
    const workbook = XLSX.utils.book_new();
    const storeGroups = storeData.reduce<Record<string, StoreRow[]>>((acc, row) => {
      acc[row.storeId] = acc[row.storeId] || [];
      acc[row.storeId].push(row);
      return acc;
    }, {});

    Object.entries(storeGroups).forEach(([storeId, rows]) => {
      if (!selectedStores.has(storeId)) return;
      
      const storeName = rows[0]?.storeName || storeId;
      const sheetData = rows.map(row => ({
        'Mã hàng': row.maHang,
        'Mã màu': row.maMau,
        'Màu chi tiết': row.mauChiTiet,
        'Size': row.size,
        'Năm gộp': row.namGop,
        'Tồn hiện tại': row.tonHienTai
      }));

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      worksheet['!cols'] = [
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 8 },
        { wch: 12 },
        { wch: 12 }
      ];
      
      XLSX.utils.book_append_sheet(workbook, worksheet, storeName.substring(0, 31));
    });

    XLSX.writeFile(workbook, 'Ton_Cua_Hang.xlsx');
  };

  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: InventoryRow[] = XLSX.utils.sheet_to_json(sheet);

        // Validate columns exist
        if (rows.length > 0) {
          const firstRow = rows[0] as any;
          if (firstRow['Mã hàng'] !== undefined && firstRow['Mã màu'] !== undefined) {
            const validatedRows = rows.map((row: any) => ({
              maHang: String(row['Mã hàng'] || ''),
              maMau: String(row['Mã màu'] || ''),
              mauChiTiet: String(row['Màu chi tiết'] || ''),
              size: String(row['Size'] || ''),
              namGop: String(row['Năm gộp'] || ''),
              tonHienTai: typeof row['Tồn hiện tại'] === 'number' ? row['Tồn hiện tại'] : 0
            }));
            setUploadedData(validatedRows);
            setGeneratedData([]);
            alert(`Tải thành công ${validatedRows.length} hàng từ file Excel`);
          } else {
            alert('File không có các cột: Mã hàng, Mã màu, Màu chi tiết, Size, Năm gộp, Tồn hiện tại');
          }
        }
      } catch (error) {
        alert('Lỗi đọc file Excel: ' + (error as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleRefresh = () => {
    setGeneratedData([]);
    setUploadedData([]);
    setStoreData([]);
    setSelectedStores(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>TokyoLife - Generator Dữ Liệu Kho Tổng</h1>
      
      <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>Tải file Excel hoặc tạo dữ liệu mới:</h3>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontSize: '14px', color: '#555', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
            Upload file Excel (*.xlsx):
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              style={{ marginLeft: '8px', padding: '6px', fontSize: '13px' }}
            />
          </label>
          {uploadedData.length > 0 && (
            <div style={{ fontSize: '12px', color: '#667eea', fontWeight: '600', marginTop: '8px' }}>
              ✅ Đã tải {uploadedData.length} hàng
              <button
                onClick={() => {
                  setUploadedData([]);
                  setGeneratedData([]);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                style={{ marginLeft: '8px', padding: '4px 8px', fontSize: '12px', backgroundColor: '#999', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Xóa
              </button>
            </div>
          )}
        </div>
        <button
          onClick={handleRefresh}
          className="btn-export"
          style={{ backgroundColor: '#999', marginTop: '4px' }}
        >
          🔁 Refresh (xóa kết quả cũ)
        </button>
      </div>

      <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>Cấu hình kho tổng:</h3>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '16px', color: '#555', fontWeight: '500' }}>
            Số lượng sản phẩm (mẫu hàng): 
            <input 
              type="number" 
              value={numProductsInput}
              onChange={(e) => {
                const val = e.target.value;
                setNumProductsInput(val);
                const parsed = parseInt(val, 10);
                if (Number.isFinite(parsed)) {
                  setNumProducts(Math.max(1, Math.round(parsed)));
                }
              }}
              onBlur={() => {
                const parsed = parseInt(numProductsInput, 10);
                const sanitized = Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : 1;
                setNumProducts(sanitized);
                setNumProductsInput(String(sanitized));
              }}
              min="1"
              style={{ marginLeft: '10px', padding: '8px', width: '100px', borderRadius: '4px', border: '2px solid #667eea', fontSize: '14px' }}
            />
          </label>
          <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px', border: '1px solid #ddd' }}>
            <p style={{ fontSize: '14px', color: '#333', marginTop: 0, marginBottom: '10px', fontWeight: '500' }}>Cấu hình SKC & Size:</p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '14px', color: '#555', fontWeight: '500' }}>
                Số SKC (màu):
                <input
                  type="number"
                  value={editColorValue}
                  onChange={(e) => updateColorValue(e.target.value)}
                  min="1"
                  max={colors.length}
                  style={{ marginLeft: '8px', padding: '6px', width: '80px', borderRadius: '4px', border: '1px solid #667eea', fontSize: '13px' }}
                />
              </label>
              <label style={{ fontSize: '14px', color: '#555', fontWeight: '500' }}>
                Số Size:
                <input
                  type="number"
                  value={editSizeValue}
                  onChange={(e) => updateSizeValue(e.target.value)}
                  min="1"
                  max={sizePool.length}
                  style={{ marginLeft: '8px', padding: '6px', width: '80px', borderRadius: '4px', border: '1px solid #667eea', fontSize: '13px' }}
                />
              </label>
              <div style={{ fontSize: '14px', color: '#667eea', fontWeight: '600', alignSelf: 'center' }}>
                = {colorsPerProduct * sizesPerColor} SKU/sản phẩm
              </div>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', marginBottom: '5px' }}>
            Tổng SKU sẽ tạo:{' '}
            {editSkuInline ? (
              <input
                autoFocus
                type="number"
                value={editValue}
                min={5}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={applyInlineEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyInlineEdit();
                  if (e.key === 'Escape') cancelInlineEdit();
                }}
                style={{
                  marginLeft: '6px',
                  padding: '4px 6px',
                  width: '80px',
                  borderRadius: '4px',
                  border: '1px solid #667eea',
                  fontSize: '12px'
                }}
              />
            ) : (
              <strong
                style={{ color: '#667eea', cursor: 'pointer' }}
                title="Double click để chỉnh số mẫu hàng"
                onDoubleClick={() => {
                  setEditValue(String(numProducts));
                  setEditSkuInline(true);
                }}
              >
                {numProducts * colorsPerProduct * sizesPerColor}
              </strong>
            )}
          </p>
        </div>
        
        <button 
          onClick={generateData}
          className="btn-primary"
        >
          🔄 Generate Data
        </button>

        {generatedData.length > 0 && (
          <button 
            onClick={exportToCSV}
            className="btn-export"
          >
            📥 Export to CSV
          </button>
        )}
      </div>

      <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>Cấu hình cửa hàng (≤30 SKU/cửa hàng):</h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '10px', alignItems: 'center' }}>
          <label style={{ fontSize: '16px', color: '#555', fontWeight: '500' }}>
            Số lượng cửa hàng:
            <input
              type="number"
              value={storeCountInput}
              onChange={(e) => {
                const val = e.target.value;
                setStoreCountInput(val);
                const parsed = parseInt(val, 10);
                if (Number.isFinite(parsed)) {
                  setStoreCount(Math.max(1, Math.round(parsed)));
                }
              }}
              onBlur={() => {
                const parsed = parseInt(storeCountInput, 10);
                const sanitized = Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : 1;
                setStoreCount(sanitized);
                setStoreCountInput(String(sanitized));
              }}
              style={{ marginLeft: '10px', padding: '8px', width: '120px', borderRadius: '4px', border: '2px solid #667eea', fontSize: '14px' }}
            />
          </label>

          <label style={{ fontSize: '16px', color: '#555', fontWeight: '500' }}>
            SKU mỗi cửa hàng (≤30):
            <input
              type="number"
              value={storeSkuMaxInput}
              onChange={(e) => {
                const val = e.target.value;
                setStoreSkuMaxInput(val);
                const parsed = parseInt(val, 10);
                if (Number.isFinite(parsed)) {
                  const clamped = Math.min(30, Math.max(1, Math.round(parsed)));
                  setStoreSkuMax(clamped);
                }
              }}
              onBlur={() => {
                const parsed = parseInt(storeSkuMaxInput, 10);
                const sanitized = Number.isFinite(parsed) ? Math.min(30, Math.max(1, Math.round(parsed))) : 30;
                setStoreSkuMax(sanitized);
                setStoreSkuMaxInput(String(sanitized));
              }}
              style={{ marginLeft: '10px', padding: '8px', width: '150px', borderRadius: '4px', border: '2px solid #667eea', fontSize: '14px' }}
            />
          </label>
        </div>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '0' }}>
          Mỗi cửa hàng sẽ sinh từ 1 đến {Math.min(30, Math.max(1, storeSkuMax))} SKU ngẫu nhiên (đã đảm bảo ≤ 30).
        </p>

        <button
          onClick={generateStoreData}
          className="btn-primary"
        >
          🏬 Generate Data Cửa Hàng
        </button>

        {storeData.length > 0 && (
          <>
            <button
              onClick={exportStoreCSV}
              className="btn-export"
              disabled={selectedStores.size === 0}
              style={{ opacity: selectedStores.size === 0 ? 0.5 : 1, cursor: selectedStores.size === 0 ? 'not-allowed' : 'pointer', marginRight: '8px' }}
            >
              📥 Export CSV Cửa Hàng ({selectedStores.size} cửa hàng)
            </button>
            <button
              onClick={exportStoresAsExcel}
              className="btn-export"
              disabled={selectedStores.size === 0}
              style={{ opacity: selectedStores.size === 0 ? 0.5 : 1, cursor: selectedStores.size === 0 ? 'not-allowed' : 'pointer' }}
            >
              📊 Export Excel ({selectedStores.size} cửa hàng)
            </button>
          </>
        )}
      </div>

      {generatedData.length > 0 && (
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '20px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#333', marginTop: 0 }}>Dữ liệu kho tổng ({generatedData.length} SKU):</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                  <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Mã hàng</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Mã màu</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Màu chi tiết</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Size</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Năm gộp</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn hiện tại</th>
                </tr>
              </thead>
              <tbody>
                {generatedData.map((row, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.maHang}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.maMau}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.mauChiTiet}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{row.size}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.namGop}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: '600', color: '#667eea' }}>{row.tonHienTai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {uploadedData.length > 0 && (
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '20px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#333', marginTop: 0 }}>Dữ liệu từ file Excel ({uploadedData.length} SKU):</h3>
          <div style={{ marginBottom: '12px' }}>
            <button
              onClick={() => {
                const combined = [...uploadedData, ...generatedData];
                const headers = ['Mã hàng', 'Mã màu', 'Màu chi tiết', 'Size', 'Năm gộp', 'Tồn hiện tại'];
                const csvContent = [
                  headers.join(','),
                  ...combined.map(row => 
                    `${row.maHang},${row.maMau},${row.mauChiTiet},${row.size},${row.namGop},${row.tonHienTai}`
                  )
                ].join('\n');

                const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'Tồn_Kho_Tổng_Merged.csv';
                link.click();
              }}
              className="btn-export"
              style={{ marginRight: '8px' }}
            >
              📥 Export CSV (Kho + Gen: {uploadedData.length + generatedData.length} SKU)
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                  <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Mã hàng</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Mã màu</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Màu chi tiết</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Size</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Năm gộp</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn hiện tại</th>
                </tr>
              </thead>
              <tbody>
                {uploadedData.map((row, index) => (
                  <tr key={`uploaded-${index}`} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.maHang}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.maMau}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.mauChiTiet}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{row.size}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.namGop}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: '600', color: '#667eea' }}>{row.tonHienTai}</td>
                  </tr>
                ))}
                {generatedData.map((row, index) => (
                  <tr key={`generated-${index}`} style={{ backgroundColor: index % 2 === 0 ? '#eef4ff' : '#f9fcff', opacity: 0.8 }}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.maHang}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.maMau}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.mauChiTiet}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{row.size}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.namGop}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: '600', color: '#667eea' }}>{row.tonHienTai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {storeData.length > 0 && (
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '20px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>Chọn cửa hàng để export:</h3>
          <div style={{ marginBottom: '15px' }}>
            <button
              onClick={() => {
                const allStoreIds = new Set(storeData.map(r => r.storeId).filter((v, i, a) => a.indexOf(v) === i));
                setSelectedStores(new Set(allStoreIds));
              }}
              style={{ marginRight: '8px', padding: '6px 12px', fontSize: '13px', backgroundColor: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              ✅ Chọn tất cả
            </button>
            <button
              onClick={() => setSelectedStores(new Set())}
              style={{ padding: '6px 12px', fontSize: '13px', backgroundColor: '#999', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              ❌ Bỏ chọn tất cả
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px', marginBottom: '15px', maxHeight: '300px', overflowY: 'auto', padding: '10px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
            {Object.entries(
              storeData.reduce<Record<string, StoreRow[]>>((acc, row) => {
                acc[row.storeId] = acc[row.storeId] || [];
                acc[row.storeId].push(row);
                return acc;
              }, {})
            ).map(([storeId, rows]) => {
              const name = rows[0]?.storeName || storeId;
              const isSelected = selectedStores.has(storeId);
              return (
                <label key={storeId} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px', backgroundColor: 'white', borderRadius: '4px', border: isSelected ? '2px solid #667eea' : '1px solid #ddd' }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      const newSelected = new Set(selectedStores);
                      if (e.target.checked) {
                        newSelected.add(storeId);
                      } else {
                        newSelected.delete(storeId);
                      }
                      setSelectedStores(newSelected);
                    }}
                    style={{ marginRight: '8px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '13px', color: '#333', fontWeight: isSelected ? '600' : '400' }}>
                    {name} ({rows.length} SKU)
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {storeData.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Object.entries(
            storeData.reduce<Record<string, StoreRow[]>>((acc, row) => {
              acc[row.storeId] = acc[row.storeId] || [];
              acc[row.storeId].push(row);
              return acc;
            }, {})
          ).map(([storeId, rows]) => {
            const name = rows[0]?.storeName || storeId;
            return (
              <div key={storeId} style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '20px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                <h3 style={{ color: '#333', marginTop: 0 }}>{name} ({rows.length} SKU)</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                        <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Mã hàng</th>
                        <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Mã màu</th>
                        <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Màu chi tiết</th>
                        <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Size</th>
                        <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Năm gộp</th>
                        <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn hiện tại</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={row.maHang + row.maMau} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.maHang}</td>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.maMau}</td>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.mauChiTiet}</td>
                          <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{row.size}</td>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.namGop}</td>
                          <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: '600', color: '#667eea' }}>{row.tonHienTai}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}

export default App

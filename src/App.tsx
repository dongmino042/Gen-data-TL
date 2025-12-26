import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import './App.css'
import { AttributeSummary, StoreSizeAnalysis } from './AttributeRanges'

interface InventoryRow {
  maHang: string;
  maMau: string;
  mauChiTiet: string;
  size: string;
  namGop: string;
  tonHienTai: number;
  thuocTinh: 'Nóng' | 'Lạnh' | 'Trung Tính';
  banTbQ1: number;
  banTbQ2: number;
  banTbQ3: number;
  banTbQ4: number;
  loaiPhuKien?: string;
}

interface StoreRow extends InventoryRow {
  storeId: string;
  storeName: string;
  vungMien: string;
  dienTich: string;
  skcLimit: number; // Sức chứa SKC trưng bày theo diện tích
  skcDisplay: number; // Số SKC trưng bày hiện có (< skcLimit và >= 2)
  // 6 two-month periods sales averages and staged stocks
  banTbThang12: number;
  banTbThang34: number;
  banTbThang56: number;
  banTbThang78: number;
  banTbThang910: number;
  banTbThang1112: number;
  tonGiaiDoan1: number;
  tonGiaiDoan2: number;
  tonGiaiDoan3: number;
  tonGiaiDoan4: number;
  tonGiaiDoan5: number;
  tonGiaiDoan6: number;
  // Recent sales windows
  ban90Ngay: number;
  ban60Ngay: number;
  ban30Ngay: number;
  ban14Ngay: number;
  ban7Ngay: number;
  // Recent stock windows
  ton90Ngay: number;
  ton60Ngay: number;
  ton30Ngay: number;
  ton14Ngay: number;
  ton7Ngay: number;
  // MOH = Months on Hand (Bán 30 ngày / Tồn hiện tại)
  moh: number;
  // Legacy aggregate fields kept for compatibility
  banTbThang: number;
  tonHienTai: number;
}

interface DistanceRow {
  fromStoreId: string;
  fromStoreName: string;
  toStoreId: string;
  toStoreName: string;
  distance: number; // km
}

interface WarehouseDistanceRow {
  storeId: string;
  storeName: string;
  distanceToWarehouse: number; // km
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

  // Shoe generation - separate state
  const [numShoes, setNumShoes] = useState<number>(10);
  const [numShoesInput, setNumShoesInput] = useState<string>('10');
  const [shoeColorsPerProduct, setShoeColorsPerProduct] = useState<number>(4);
  const [shoeSizesPerColor, setShoeSizesPerColor] = useState<number>(6);
  const [editShoeColorValue, setEditShoeColorValue] = useState<string>('4');
  const [editShoeSizeValue, setEditShoeSizeValue] = useState<string>('6');
  const [shoeGenderType, setShoeGenderType] = useState<'all' | 'male' | 'female' | 'kids'>('all');
  const [shoeData, setShoeData] = useState<InventoryRow[]>([]);

  // Accessory generation - separate state
  const [numAccessories, setNumAccessories] = useState<number>(10);
  const [numAccessoriesInput, setNumAccessoriesInput] = useState<string>('10');
  const [accessoryColorsPerProduct, setAccessoryColorsPerProduct] = useState<number>(3);
  const [editAccessoryColorValue, setEditAccessoryColorValue] = useState<string>('3');
  const [accessoryData, setAccessoryData] = useState<InventoryRow[]>([]);

  // Distance data state
  const [storeDistances, setStoreDistances] = useState<DistanceRow[]>([]);
  const [warehouseDistances, setWarehouseDistances] = useState<WarehouseDistanceRow[]>([]);

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

  const accessories = [
    { code: 'Non', name: 'Nón' },
    { code: 'Tui', name: 'Túi xách' },
    { code: 'That', name: 'Thắt lưng' },
    { code: 'Day', name: 'Dây chuyền' },
    { code: 'Tat', name: 'Tất' },
    { code: 'Gang', name: 'Găng tay' },
    { code: 'Khan', name: 'Khăn' },
    { code: 'Kinh', name: 'Kính' },
  ];

  const sizePool = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
  const sizes = sizePool.slice(0, Math.max(1, Math.min(sizePool.length, sizesPerColor)));
  
  // Shoe sizes for different demographics
  const allShoeSizes = ['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
  const maleShoeSizes = ['39', '40', '41', '42', '43', '44', '45', '46'];
  const femaleShoeSizes = ['34', '35', '36', '37', '38', '39', '40', '41'];
  const kidsShoeSizes = ['28', '29', '30', '31', '32', '33', '34', '35', '36'];
  
  const getShoePoolByType = () => {
    if (shoeGenderType === 'male') return maleShoeSizes;
    if (shoeGenderType === 'female') return femaleShoeSizes;
    if (shoeGenderType === 'kids') return kidsShoeSizes;
    return allShoeSizes;
  };
  
  const shoePoolForType = getShoePoolByType();
  const shoeSizes = shoePoolForType.slice(0, Math.max(1, Math.min(shoePoolForType.length, shoeSizesPerColor)));
  const years = ['2024', '2023', 'trước 2023'];

  const storeCities = ['Hà Nội', 'Hải Phòng', 'Đà Nẵng', 'Nha Trang', 'Hồ Chí Minh', 'Cần Thơ', 'Biên Hòa', 'Bình Dương', 'Hạ Long', 'Vinh', 'Huế'];
  const storePrefixes = ['TokyoLife', 'TL Mart', 'TL Fashion', 'TokyoLite'];

  const makeQuarterAverages = (maxValue: number, zeroProbability: number) => {
    const sample = () => (Math.random() < zeroProbability ? 0 : Math.floor(Math.random() * maxValue));
    const q1 = sample();
    const q2 = sample();
    const q3 = sample();
    const q4 = sample();
    return { q1, q2, q3, q4 };
  };

  // Sample tồn hiện tại với tỷ lệ bằng 0 có thể điều chỉnh
  const sampleStock = (maxValue: number, zeroProbability: number) => {
    return Math.random() < zeroProbability ? 0 : Math.floor(Math.random() * (maxValue + 1));
  };

  // Generate six 2-month sales averages and staged stocks where each stage stock depletes by that period's sales
  const generateSalesAndStocks = (stockMax: number, saleMax: number, stockZeroProb = 0.3, saleZeroProb = 0.2) => {
    const sales: number[] = [];
    const stocks: number[] = [];
    let currentStock = sampleStock(stockMax, stockZeroProb);

    for (let i = 0; i < 6; i++) {
      stocks.push(currentStock);
      const sale = sampleStock(saleMax, saleZeroProb);
      sales.push(sale);
      currentStock = Math.max(0, currentStock - sale);
    }

    return { sales, stocks };
  };

  const makeRecentSales = (monthlyAvg: number, currentStock: number) => {
    const clampNonNegative = (val: number) => Math.max(0, Math.round(val));
    const jitter = (base: number, minFactor: number, maxFactor: number) => base * (minFactor + Math.random() * (maxFactor - minFactor));
    const zeroProb = 0.4; // 40% tỉ lệ bán = 0

    const avg = Math.max(0, monthlyAvg);
    
    // Nếu không có bán trong 7 ngày gần nhất thì toàn bộ là 0
    // Nếu có bán thì tính bình thường đảm bảo: bán 90 ngày > bán 60 ngày > bán 30 ngày > bán 14 ngày > bán 7 ngày
    if (Math.random() < zeroProb) {
      // Tất cả = 0
      const ban7Ngay = 0;
      const ban14Ngay = 0;
      const ban30Ngay = 0;
      const ban60Ngay = 0;
      const ban90Ngay = 0;
      
      const ton7Ngay = Math.max(0, currentStock);
      const ton14Ngay = Math.max(0, ton7Ngay + ban7Ngay);
      const ton30Ngay = Math.max(0, ton14Ngay + ban14Ngay);
      const ton60Ngay = Math.max(0, ton30Ngay + ban30Ngay);
      const ton90Ngay = Math.max(0, ton60Ngay + ban60Ngay);

      return { 
        ban90Ngay, ban60Ngay, ban30Ngay, ban14Ngay, ban7Ngay,
        ton90Ngay, ton60Ngay, ton30Ngay, ton14Ngay, ton7Ngay
      };
    }

    // Nếu có bán hàng - bán X ngày là TỔNG bán trong X ngày gần nhất
    const ban7Ngay = clampNonNegative(jitter(avg * 0.25, 0.7, 1.0));
    const ban14Ngay = Math.max(ban7Ngay + 1, clampNonNegative(jitter(avg * 0.5, 0.7, 1.1)));
    const ban30Ngay = Math.max(ban14Ngay + 1, clampNonNegative(jitter(avg, 0.8, 1.2)));
    const ban60Ngay = Math.max(ban30Ngay + 1, clampNonNegative(jitter(avg * 1.8, 0.8, 1.2)));
    const ban90Ngay = Math.max(ban60Ngay + 1, clampNonNegative(jitter(avg * 2.7, 0.8, 1.2)));

    // Tính tồn kho - tồn X ngày là tồn kho VÀO thời điểm X ngày trước (trước khi bán)
    // ton7Ngay: tồn hiện tại (sau khi bán 7 ngày)
    const ton7Ngay = Math.max(0, currentStock);
    // ton14Ngay: tồn 14 ngày trước = ton7Ngay + (bán từ ngày 7→14)
    const ton14Ngay = Math.max(0, ton7Ngay + (ban14Ngay - ban7Ngay));
    // ton30Ngay: tồn 30 ngày trước = ton14Ngay + (bán từ ngày 14→30)
    const ton30Ngay = Math.max(0, ton14Ngay + (ban30Ngay - ban14Ngay));
    // ton60Ngay: tồn 60 ngày trước = ton30Ngay + (bán từ ngày 30→60)
    const ton60Ngay = Math.max(0, ton30Ngay + (ban60Ngay - ban30Ngay));
    // ton90Ngay: tồn 90 ngày trước = ton60Ngay + (bán từ ngày 60→90)
    const ton90Ngay = Math.max(0, ton60Ngay + (ban90Ngay - ban60Ngay));

    return { 
      ban90Ngay, ban60Ngay, ban30Ngay, ban14Ngay, ban7Ngay,
      ton90Ngay, ton60Ngay, ton30Ngay, ton14Ngay, ton7Ngay
    };
  };

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
          const tonHienTai = sampleStock(100, 0.3); // tăng tỷ lệ tồn = 0
          const thuocTinh: InventoryRow['thuocTinh'] = ['Đỏ', 'Hồng', 'Vàng', 'Cam'].includes(color.name)
            ? 'Nóng'
            : ['Xanh', 'Tím'].includes(color.name)
              ? 'Lạnh'
              : 'Trung Tính';
          const { q1, q2, q3, q4 } = makeQuarterAverages(80, 0.35); // smaller avg, more zeros

          data.push({
            maHang,
            maMau,
            mauChiTiet: color.name,
            size,
            namGop: year,
            tonHienTai,
            thuocTinh,
            banTbQ1: q1,
            banTbQ2: q2,
            banTbQ3: q3,
            banTbQ4: q4
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

  const updateShoeSizeValue = (val: string) => {
    setEditShoeSizeValue(val);
    const parsed = parseInt(val, 10);
    if (Number.isFinite(parsed)) {
      const poolLength = shoePoolForType.length;
      const sanitized = Math.max(1, Math.min(poolLength, Math.round(parsed)));
      setShoeSizesPerColor(sanitized);
    }
  };

  const generateShoeData = () => {
    const data: InventoryRow[] = [];
    const productsToGenerate = Math.max(1, Math.round(numShoes));
    const genderType = shoeGenderType === 'all' ? '7' : shoeGenderType === 'male' ? '8' : shoeGenderType === 'female' ? '9' : '10';
    const baseCode = parseInt(`${genderType}000000`);

    for (let i = 0; i < productsToGenerate; i++) {
      const maHang = `${baseCode + i}`;

      const shuffledColors = [...colors].sort(() => Math.random() - 0.5);
      const selectedColors = shuffledColors.slice(0, shoeColorsPerProduct);

      selectedColors.forEach(color => {
        const maMau = `${maHang}${color.code}`;

        shoeSizes.forEach(size => {
          const year = years[Math.floor(Math.random() * years.length)];
          const tonHienTai = sampleStock(100, 0.3); // tăng tỷ lệ tồn = 0
          const thuocTinh: InventoryRow['thuocTinh'] = ['Đỏ', 'Hồng', 'Vàng', 'Cam'].includes(color.name)
            ? 'Nóng'
            : ['Xanh', 'Tím'].includes(color.name)
              ? 'Lạnh'
              : 'Trung Tính';
            const { q1, q2, q3, q4 } = makeQuarterAverages(60, 0.4); // lower range, more zeros

          data.push({
            maHang,
            maMau,
            mauChiTiet: color.name,
            size,
            namGop: year,
            tonHienTai,
              thuocTinh,
              banTbQ1: q1,
              banTbQ2: q2,
              banTbQ3: q3,
              banTbQ4: q4
          });
        });
      });
    }

    setShoeData(data);
  };

  const generateAccessoryData = () => {
    const data: InventoryRow[] = [];
    const productsToGenerate = Math.max(1, Math.round(numAccessories));
    const baseCode = 9000000;

    for (let i = 0; i < productsToGenerate; i++) {
      const maHang = `${baseCode + i}`;
      const accessoryType = accessories[Math.floor(Math.random() * accessories.length)];
      
      // Xác định thuocTinh dựa trên loại phụ kiện - dùng chung cho tất cả màu của sản phẩm này
      const neutralItems = ['Dây chuyền', 'Kính', 'Túi xách', 'Thắt lưng', 'Khăn'];
      const thuocTinh: InventoryRow['thuocTinh'] = neutralItems.includes(accessoryType.name)
        ? 'Trung Tính'
        : ['Tất', 'Nón'].includes(accessoryType.name)
          ? (Math.random() > 0.5 ? 'Nóng' : 'Lạnh') // Tất và nón thì random nóng/lạnh
          : 'Trung Tính';
      
      const shuffledColors = [...colors].sort(() => Math.random() - 0.5);
      const selectedColors = shuffledColors.slice(0, accessoryColorsPerProduct);

      selectedColors.forEach(color => {
        const maMau = `${maHang}${color.code}`;
        const year = years[Math.floor(Math.random() * years.length)];
        const tonHienTai = sampleStock(100, 0.3); // tăng tỷ lệ tồn = 0
        
        const { q1, q2, q3, q4 } = makeQuarterAverages(50, 0.45); // phụ kiện có khả năng bán thấp hơn

        data.push({
          maHang,
          maMau,
          mauChiTiet: color.name,
          size: 'One Size',
          namGop: year,
          tonHienTai,
          thuocTinh,
          banTbQ1: q1,
          banTbQ2: q2,
          banTbQ3: q3,
          banTbQ4: q4,
          loaiPhuKien: accessoryType.name
        });
      });
    }

    setAccessoryData(data);
  };

  const makeSheetName = (label: string) => label.substring(0, 31) || 'Sheet1';

  const exportCSVFromRows = (fileName: string, rows: Record<string, string | number>[]) => {
    if (rows.length === 0) {
      alert('Không có dữ liệu để export.');
      return;
    }
    
    // Lấy headers
    const headers = Object.keys(rows[0]);
    
    // Tạo CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape quotes và wrap trong quotes nếu chứa comma, newline, hoặc quote
          if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    // Tạo blob và download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcelFromRows = (fileName: string, sheetName: string, rows: Record<string, string | number>[]) => {
    if (rows.length === 0) {
      alert('Không có dữ liệu để export.');
      return;
    }
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, makeSheetName(sheetName));
    XLSX.writeFile(workbook, fileName);
  };

  const exportMasterExcelTable = () => {
    const rows = generatedData.map(row => ({
      'Mã hàng': row.maHang,
      'Mã màu': row.maMau,
      'Màu chi tiết': row.mauChiTiet,
      'Size': row.size,
      'Năm gộp': row.namGop,
      'Thuộc tính': row.thuocTinh,
      'Tồn hiện tại': row.tonHienTai,
    }));
    exportCSVFromRows('Kho_Tong_Bang_Hien_Thi.csv', rows);
  };

  const exportShoesExcelTable = () => {
    const rows = shoeData.map(row => ({
      'Mã hàng': row.maHang,
      'Mã màu': row.maMau,
      'Màu chi tiết': row.mauChiTiet,
      'Size': row.size,
      'Năm gộp': row.namGop,
      'Thuộc tính': row.thuocTinh,
      'Tồn hiện tại': row.tonHienTai,
    }));
    exportCSVFromRows('Kho_Giay_Bang_Hien_Thi.csv', rows);
  };

  const exportAccessoryExcelTable = () => {
    const rows = accessoryData.map(row => ({
      'Mã hàng': row.maHang,
      'Mã màu': row.maMau,
      'Loại phụ kiện': row.loaiPhuKien || '',
      'Màu chi tiết': row.mauChiTiet,
      'Năm gộp': row.namGop,
      'Thuộc tính': row.thuocTinh,
      'Tồn hiện tại': row.tonHienTai,
    }));
    exportCSVFromRows('Kho_Phu_Kien_Bang_Hien_Thi.csv', rows);
  };

  const makeStoreName = (idx: number) => {
    const prefix = storePrefixes[idx % storePrefixes.length];
    const city = storeCities[idx % storeCities.length];
    const branch = idx + 1;
    return `${prefix} ${city} ${branch}`;
  };

  const getRegionByCity = (city: string): string => {
    const s1 = ['Hà Nội', 'Hải Phòng', 'Hạ Long', 'Vinh']; // Miền bắc
    const s2 = ['Lào Cai', 'Điện Biên', 'Sơn La']; // Miền núi (dự phòng khi mở rộng danh sách)
    const s3 = ['Đà Nẵng', 'Nha Trang', 'Huế']; // Miền trung
    const s4 = ['Hồ Chí Minh', 'Biên Hòa', 'Bình Dương']; // Miền nam
    const s5 = ['Cần Thơ']; // Đồng bằng SCL

    if (s1.includes(city)) return 'S1 - Miền bắc';
    if (s2.includes(city)) return 'S2 - Miền núi';
    if (s3.includes(city)) return 'S3 - Miền trung';
    if (s4.includes(city)) return 'S4 - Miền nam';
    if (s5.includes(city)) return 'S5 - Đồng bằng SCL';
    return 'S2 - Miền núi';
  };

  const getRandomArea = (): string => {
    const areas = ['<100M', '100-200M', '200-400M', '400-600M', '>600M'];
    return areas[Math.floor(Math.random() * areas.length)];
  };

  // Tính SKC Limit (sức chứa trưng bày) dựa trên diện tích và số SKU
  // SKC Limit = % của số SKU, phụ thuộc vào diện tích
  const getSKCLimitByAreaAndSKU = (area: string, totalSKU: number): number => {
    // Tỷ lệ % SKU được trưng bày theo diện tích (tăng cao hơn)
    const percentRanges: Record<string, [number, number]> = {
      '<100M': [40, 55],      // 40-55% của SKU
      '100-200M': [50, 65],   // 50-65% của SKU
      '200-400M': [60, 75],   // 60-75% của SKU
      '400-600M': [70, 80],   // 70-80% của SKU
      '>600M': [75, 90],      // 75-90% của SKU
    };
    
    const [minPercent, maxPercent] = percentRanges[area] || [40, 55];
    const percent = minPercent + Math.random() * (maxPercent - minPercent);
    const skcLimit = Math.max(2, Math.floor(totalSKU * percent / 100));
    return Math.min(skcLimit, totalSKU); // Không vượt quá số SKU
  };

  // Tính SKC Display (số SKC trưng bày hiện có) - random từ 2 đến (skcLimit - 1)
  const getSKCDisplay = (skcLimit: number): number => {
    if (skcLimit <= 2) return 2;
    const min = 2;
    const max = Math.max(2, skcLimit - 1);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const generateStoreData = () => {
    if (generatedData.length === 0) {
      alert('Cần generate kho quần áo trước.');
      return;
    }
    const rows: StoreRow[] = [];
    const maxPerStore = Math.min(30, Math.max(1, storeSkuMax));

    // Nhóm dữ liệu kho theo maHang để lấy nhiều SKU cùng mã
    const groupedByMaHang: Record<string, InventoryRow[]> = {};
    generatedData.forEach(row => {
      if (!groupedByMaHang[row.maHang]) {
        groupedByMaHang[row.maHang] = [];
      }
      groupedByMaHang[row.maHang].push(row);
    });

    const maHangList = Object.keys(groupedByMaHang);

    for (let i = 0; i < storeCount; i++) {
      const storeId = `CH-${String(i + 1).padStart(3, '0')}`;
      const storeName = makeStoreName(i);
      const city = storeCities[i % storeCities.length];
      const vungMien = getRegionByCity(city);
      const dienTich = getRandomArea();
      
      // Chọn số lượng mã hàng ngẫu nhiên cho cửa hàng (1 đến maxPerStore)
      const numMaHang = Math.floor(Math.random() * maxPerStore) + 1;
      const shuffledMaHang = [...maHangList].sort(() => Math.random() - 0.5).slice(0, numMaHang);
      
      // Tính tổng SKU của cửa hàng này trước
      const storeSkus: InventoryRow[] = [];
      shuffledMaHang.forEach(maHang => {
        const skusForThisMaHang = groupedByMaHang[maHang];
        const maxSkuForThisMaHang = Math.min(skusForThisMaHang.length, Math.ceil(maxPerStore / numMaHang));
        const numSkuToTake = Math.floor(Math.random() * maxSkuForThisMaHang) + 1;
        const selectedSkus = [...skusForThisMaHang].sort(() => Math.random() - 0.5).slice(0, numSkuToTake);
        
        // Tăng tỉ lệ gãy size (30% xác suất bỏ 1-2 size ngẫu nhiên)
        const gapSizeProb = 0.3; // 30% xác suất gãy size
        if (Math.random() < gapSizeProb && selectedSkus.length > 2) {
          const numSizesToRemove = Math.floor(Math.random() * 2) + 1; // Bỏ 1-2 size
          for (let i = 0; i < numSizesToRemove && selectedSkus.length > 1; i++) {
            const idxToRemove = Math.floor(Math.random() * selectedSkus.length);
            selectedSkus.splice(idxToRemove, 1);
          }
        }
        
        storeSkus.push(...selectedSkus);
      });
      
      // Tính SKC Limit dựa trên tổng SKU của cửa hàng
      const totalSKU = storeSkus.length;
      const skcLimit = getSKCLimitByAreaAndSKU(dienTich, totalSKU);

      // Tạo rows với skcLimit đã tính
      storeSkus.forEach(baseRow => {
        const { sales, stocks } = generateSalesAndStocks(50, 30, 0.3, 0.5);
        const banTbThang = Math.round(sales.reduce((a, b) => a + b, 0) / 6);
        const recent = makeRecentSales(banTbThang, stocks[0]);
        const moh = stocks[0] > 0 ? Math.round((recent.ban30Ngay / stocks[0]) * 100) / 100 : 0;
        const skcDisplay = getSKCDisplay(skcLimit);

        rows.push({
          ...baseRow,
          storeId,
          storeName,
          tonHienTai: stocks[0],
          banTbQ1: 0,
          banTbQ2: 0,
          banTbQ3: 0,
          banTbQ4: 0,
          banTbThang,
          ...recent,
          moh,
          vungMien,
          dienTich,
          skcLimit,
          skcDisplay,
          banTbThang12: sales[0],
          banTbThang34: sales[1],
          banTbThang56: sales[2],
          banTbThang78: sales[3],
          banTbThang910: sales[4],
          banTbThang1112: sales[5],
          tonGiaiDoan1: stocks[0],
          tonGiaiDoan2: stocks[1],
          tonGiaiDoan3: stocks[2],
          tonGiaiDoan4: stocks[3],
          tonGiaiDoan5: stocks[4],
          tonGiaiDoan6: stocks[5],
        });
      });
    }

    setStoreData(rows);
    setSelectedStores(new Set(rows.map(r => r.storeId).filter((v, i, a) => a.indexOf(v) === i)));
  };

  const generateStoreShoesFromMaster = () => {
    if (shoeData.length === 0) {
      alert('Cần generate kho giày trước.');
      return;
    }
    const maxPerStore = Math.min(30, Math.max(1, storeSkuMax));
    const newRows: StoreRow[] = [];

    for (let i = 0; i < storeCount; i++) {
      const storeId = `CH-${String(i + 1).padStart(3, '0')}`;
      const storeName = makeStoreName(i);
      const city = storeCities[i % storeCities.length];
      const vungMien = getRegionByCity(city);
      const dienTich = getRandomArea();
      const count = Math.max(1, Math.min(maxPerStore, Math.floor(Math.random() * maxPerStore) + 1));
      const shuffled = [...shoeData].sort(() => Math.random() - 0.5).slice(0, count);
      
      // Tăng tị lệ gãy size (50% xác suất bỏ 1-2 size ngẫu nhiên)
      const gapSizeProb = 0.50;
      if (Math.random() < gapSizeProb && shuffled.length > 2) {
        const numSizesToRemove = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < numSizesToRemove && shuffled.length > 1; i++) {
          const idxToRemove = Math.floor(Math.random() * shuffled.length);
          shuffled.splice(idxToRemove, 1);
        }
      }
      
      // Tính SKC Limit dựa trên tổng SKU của cửa hàng
      const skcLimit = getSKCLimitByAreaAndSKU(dienTich, shuffled.length);

      shuffled.forEach(baseRow => {
        const { sales, stocks } = generateSalesAndStocks(35, 20, 0.3, 0.5);
        const banTbThang = Math.round(sales.reduce((a, b) => a + b, 0) / 6);
        const recent = makeRecentSales(banTbThang, stocks[0]);
        const moh = stocks[0] > 0 ? Math.round((recent.ban30Ngay / stocks[0]) * 100) / 100 : 0;
        const skcDisplay = getSKCDisplay(skcLimit);
        newRows.push({
          ...baseRow,
          storeId,
          storeName,
          tonHienTai: stocks[0],
          banTbQ1: 0,
          banTbQ2: 0,
          banTbQ3: 0,
          banTbQ4: 0,
          banTbThang,
          ...recent,
          moh,
          vungMien,
          dienTich,
          skcLimit,
          skcDisplay,
          banTbThang12: sales[0],
          banTbThang34: sales[1],
          banTbThang56: sales[2],
          banTbThang78: sales[3],
          banTbThang910: sales[4],
          banTbThang1112: sales[5],
          tonGiaiDoan1: stocks[0],
          tonGiaiDoan2: stocks[1],
          tonGiaiDoan3: stocks[2],
          tonGiaiDoan4: stocks[3],
          tonGiaiDoan5: stocks[4],
          tonGiaiDoan6: stocks[5],
        });
      });
    }

    const merged = [...storeData, ...newRows];
    setStoreData(merged);
    const allStoreIds = new Set(merged.map(r => r.storeId));
    setSelectedStores(allStoreIds);
  };

  const generateStoreAccessoriesFromMaster = () => {
    if (accessoryData.length === 0) {
      alert('Cần generate kho phụ kiện trước.');
      return;
    }
    const maxPerStore = Math.min(30, Math.max(1, storeSkuMax));
    const newRows: StoreRow[] = [];

    for (let i = 0; i < storeCount; i++) {
      const storeId = `CH-${String(i + 1).padStart(3, '0')}`;
      const storeName = makeStoreName(i);
      const city = storeCities[i % storeCities.length];
      const vungMien = getRegionByCity(city);
      const dienTich = getRandomArea();
      const count = Math.max(1, Math.min(maxPerStore, Math.floor(Math.random() * maxPerStore) + 1));
      const shuffled = [...accessoryData].sort(() => Math.random() - 0.5).slice(0, count);
      
      // Tăng tị lệ gãy size (35% xác suất bỏ 1-2 size ngẫu nhiên)
      const gapSizeProb = 0.35;
      if (Math.random() < gapSizeProb && shuffled.length > 2) {
        const numSizesToRemove = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < numSizesToRemove && shuffled.length > 1; i++) {
          const idxToRemove = Math.floor(Math.random() * shuffled.length);
          shuffled.splice(idxToRemove, 1);
        }
      }
      
      // Tính SKC Limit dựa trên tổng SKU của cửa hàng
      const skcLimit = getSKCLimitByAreaAndSKU(dienTich, shuffled.length);

      shuffled.forEach(baseRow => {
        const { sales, stocks } = generateSalesAndStocks(35, 15, 0.3, 0.5);
        const banTbThang = Math.round(sales.reduce((a, b) => a + b, 0) / 6);
        const recent = makeRecentSales(banTbThang, stocks[0]);
        const moh = stocks[0] > 0 ? Math.round((recent.ban30Ngay / stocks[0]) * 100) / 100 : 0;
        const skcDisplay = getSKCDisplay(skcLimit);
        newRows.push({
          ...baseRow,
          storeId,
          storeName,
          tonHienTai: stocks[0],
          banTbQ1: 0,
          banTbQ2: 0,
          banTbQ3: 0,
          banTbQ4: 0,
          banTbThang,
          ...recent,
          moh,
          vungMien,
          dienTich,
          skcLimit,
          skcDisplay,
          banTbThang12: sales[0],
          banTbThang34: sales[1],
          banTbThang56: sales[2],
          banTbThang78: sales[3],
          banTbThang910: sales[4],
          banTbThang1112: sales[5],
          tonGiaiDoan1: stocks[0],
          tonGiaiDoan2: stocks[1],
          tonGiaiDoan3: stocks[2],
          tonGiaiDoan4: stocks[3],
          tonGiaiDoan5: stocks[4],
          tonGiaiDoan6: stocks[5],
        });
      });
    }

    const merged = [...storeData, ...newRows];
    setStoreData(merged);
    const allStoreIds = new Set(merged.map(r => r.storeId));
    setSelectedStores(allStoreIds);
  };

  const exportMergedExcel = () => {
    const combined = [...uploadedData, ...generatedData];
    if (combined.length === 0) {
      alert('Không có dữ liệu để export.');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const groups = combined.reduce<Record<string, InventoryRow[]>>((acc, row) => {
      acc[row.maHang] = acc[row.maHang] || [];
      acc[row.maHang].push(row);
      return acc;
    }, {});

    Object.entries(groups).forEach(([maHang, rows]) => {
      const sheetData = rows.map(row => ({
        'Mã hàng': row.maHang,
        'Mã màu': row.maMau,
        'Màu chi tiết': row.mauChiTiet,
        'Size': row.size,
        'Năm gộp': row.namGop,
        'Tồn hiện tại': row.tonHienTai,
        'Thuộc tính': row.thuocTinh
      }));

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      worksheet['!cols'] = [
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 8 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 }
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, makeSheetName(`MA-${maHang}`));
    });

    XLSX.writeFile(workbook, 'Kho_Tong_Merged.xlsx');
  };

  const exportStoreClothingTable = () => {
    const clothingOnly = storeData.filter(row => !row.loaiPhuKien);
    const filtered = clothingOnly.filter(row => selectedStores.has(row.storeId));
    const rows = filtered.map(row => ({
      'Mã hàng': row.maHang,
      'Mã màu': row.maMau,
      'Màu chi tiết': row.mauChiTiet,
      'Size': row.size,
      'Năm gộp': row.namGop,
      'Thuộc tính': row.thuocTinh,
      'Tồn hiện tại': row.tonHienTai,
      'Bán 90 ngày': row.ban90Ngay,
      'Bán 60 ngày': row.ban60Ngay,
      'Bán 30 ngày': row.ban30Ngay,
      'Bán 14 ngày': row.ban14Ngay,
      'Bán 7 ngày': row.ban7Ngay,
      'Tồn 90 ngày': row.ton90Ngay,
      'Tồn 60 ngày': row.ton60Ngay,
      'Tồn 30 ngày': row.ton30Ngay,
      'Tồn 14 ngày': row.ton14Ngay,
      'Tồn 7 ngày': row.ton7Ngay,
      'MOH': row.moh,
      'Vùng miền': row.vungMien,
      'Cửa hàng': row.storeName,
      'Mã cửa hàng': row.storeId,
      'Diện tích': row.dienTich,
      'SKC Limit': row.skcLimit,
      'SKC Trưng bày': row.skcDisplay,
    }));
    exportCSVFromRows('Cua_Hang_Quan_Ao_Bang_Hien_Thi.csv', rows);
  };

  const exportStoreShoesTable = () => {
    const shoeStoreData = storeData.filter(row => !row.loaiPhuKien && parseInt(row.maHang) >= 7000000 && parseInt(row.maHang) < 8000000);
    const filtered = shoeStoreData.filter(row => selectedStores.has(row.storeId));
    const rows = filtered.map(row => ({
      'Mã hàng': row.maHang,
      'Mã màu': row.maMau,
      'Màu chi tiết': row.mauChiTiet,
      'Size': row.size,
      'Năm gộp': row.namGop,
      'Thuộc tính': row.thuocTinh,
      'Tồn hiện tại': row.tonHienTai,
      'Bán 90 ngày': row.ban90Ngay,
      'Bán 60 ngày': row.ban60Ngay,
      'Bán 30 ngày': row.ban30Ngay,
      'Bán 14 ngày': row.ban14Ngay,
      'Bán 7 ngày': row.ban7Ngay,
      'Tồn 90 ngày': row.ton90Ngay,
      'Tồn 60 ngày': row.ton60Ngay,
      'Tồn 30 ngày': row.ton30Ngay,
      'Tồn 14 ngày': row.ton14Ngay,
      'Tồn 7 ngày': row.ton7Ngay,
      'MOH': row.moh,
      'Vùng miền': row.vungMien,
      'Cửa hàng': row.storeName,
      'Mã cửa hàng': row.storeId,
      'Diện tích': row.dienTich,
    }));
    exportCSVFromRows('Cua_Hang_Giay_Bang_Hien_Thi.csv', rows);
  };

  const exportStoreAccessoriesTable = () => {
    const accessoriesData = storeData.filter(row => row.loaiPhuKien && row.loaiPhuKien.trim() !== '');
    const filtered = accessoriesData.filter(row => selectedStores.has(row.storeId));
    const rows = filtered.map(row => ({
      'Mã hàng': row.maHang,
      'Mã màu': row.maMau,
      'Loại phụ kiện': row.loaiPhuKien || '',
      'Màu chi tiết': row.mauChiTiet,
      'Năm gộp': row.namGop,
      'Thuộc tính': row.thuocTinh,
      'Tồn hiện tại': row.tonHienTai,
      'Bán 90 ngày': row.ban90Ngay,
      'Bán 60 ngày': row.ban60Ngay,
      'Bán 30 ngày': row.ban30Ngay,
      'Bán 14 ngày': row.ban14Ngay,
      'Bán 7 ngày': row.ban7Ngay,
      'Tồn 90 ngày': row.ton90Ngay,
      'Tồn 60 ngày': row.ton60Ngay,
      'Tồn 30 ngày': row.ton30Ngay,
      'Tồn 14 ngày': row.ton14Ngay,
      'Tồn 7 ngày': row.ton7Ngay,
      'MOH': row.moh,
      'Vùng miền': row.vungMien,
      'Cửa hàng': row.storeName,
      'Mã cửa hàng': row.storeId,
      'Diện tích': row.dienTich,
      'SKC Limit': row.skcLimit,
      'SKC Trưng bày': row.skcDisplay,
    }));
    exportCSVFromRows('Cua_Hang_Phu_Kien_Bang_Hien_Thi.csv', rows);
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
            const validatedRows = rows.map((row: any) => {
              const colorName = String(row['Màu chi tiết'] || '');
              const derivedAttr: InventoryRow['thuocTinh'] = ['Đỏ', 'Hồng', 'Vàng', 'Cam'].includes(colorName)
                ? 'Nóng'
                : ['Xanh', 'Tím'].includes(colorName)
                  ? 'Lạnh'
                  : 'Trung Tính';
              const attr = String(row['Thuộc tính'] || '').trim();
              const normalizedAttr = attr === 'Nóng' || attr === 'Lạnh' || attr === 'Trung Tính' ? (attr as InventoryRow['thuocTinh']) : derivedAttr;
              const q1 = typeof row['Bán TB Q1'] === 'number' ? row['Bán TB Q1'] : 0;
              const q2 = typeof row['Bán TB Q2'] === 'number' ? row['Bán TB Q2'] : 0;
              const q3 = typeof row['Bán TB Q3'] === 'number' ? row['Bán TB Q3'] : 0;
              const q4 = typeof row['Bán TB Q4'] === 'number' ? row['Bán TB Q4'] : 0;
              return ({
              maHang: String(row['Mã hàng'] || ''),
              maMau: String(row['Mã màu'] || ''),
              mauChiTiet: String(row['Màu chi tiết'] || ''),
              size: String(row['Size'] || ''),
              namGop: String(row['Năm gộp'] || ''),
              tonHienTai: typeof row['Tồn hiện tại'] === 'number' ? row['Tồn hiện tại'] : 0,
              thuocTinh: normalizedAttr,
              banTbQ1: q1,
              banTbQ2: q2,
              banTbQ3: q3,
              banTbQ4: q4
            });
            });
            setUploadedData(validatedRows);
            setGeneratedData([]);
            alert(`Tải thành công ${validatedRows.length} hàng từ file Excel`);
          } else {
            alert('File không có các cột: Mã hàng, Mã màu, Màu chi tiết, Size, Năm gộp, Tồn hiện tại (có thể thêm Thuộc tính, Bán TB Q1-4)');
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
    setShoeData([]);
    setAccessoryData([]);
    setUploadedData([]);
    setStoreData([]);
    setSelectedStores(new Set());
    setStoreDistances([]);
    setWarehouseDistances([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Generate random distance between 10-500 km
  const generateRandomDistance = () => {
    return Math.floor(Math.random() * 491) + 10;
  };

  // Generate distances between all pairs of stores
  const generateStoreDistances = () => {
    if (storeData.length === 0) {
      alert('Cần generate dữ liệu cửa hàng trước.');
      return;
    }

    // Get unique stores
    const uniqueStores: { storeId: string; storeName: string }[] = [];
    const seenIds = new Set<string>();
    
    storeData.forEach(row => {
      if (!seenIds.has(row.storeId)) {
        seenIds.add(row.storeId);
        uniqueStores.push({ storeId: row.storeId, storeName: row.storeName });
      }
    });

    const distances: DistanceRow[] = [];
    
    // Generate distances for all pairs of stores (one-way only to avoid duplicates)
    for (let i = 0; i < uniqueStores.length; i++) {
      for (let j = i + 1; j < uniqueStores.length; j++) {
        const distance = generateRandomDistance();
        // Keep a single direction per pair
        distances.push({
          fromStoreId: uniqueStores[i].storeId,
          fromStoreName: uniqueStores[i].storeName,
          toStoreId: uniqueStores[j].storeId,
          toStoreName: uniqueStores[j].storeName,
          distance
        });
      }
    }

    setStoreDistances(distances);
  };

  // Generate distances from each store to warehouse
  const generateWarehouseDistances = () => {
    if (storeData.length === 0) {
      alert('Cần generate dữ liệu cửa hàng trước.');
      return;
    }

    // Get unique stores
    const uniqueStores: { storeId: string; storeName: string }[] = [];
    const seenIds = new Set<string>();
    
    storeData.forEach(row => {
      if (!seenIds.has(row.storeId)) {
        seenIds.add(row.storeId);
        uniqueStores.push({ storeId: row.storeId, storeName: row.storeName });
      }
    });

    const distances: WarehouseDistanceRow[] = uniqueStores.map(store => ({
      storeId: store.storeId,
      storeName: store.storeName,
      distanceToWarehouse: generateRandomDistance()
    }));

    setWarehouseDistances(distances);
  };

  const exportStoreDistances = () => {
    const rows = storeDistances.map(row => ({
      'Từ cửa hàng (Mã)': row.fromStoreId,
      'Từ cửa hàng (Tên)': row.fromStoreName,
      'Đến cửa hàng (Mã)': row.toStoreId,
      'Đến cửa hàng (Tên)': row.toStoreName,
      'Khoảng cách (km)': row.distance
    }));
    exportExcelFromRows('Khoang_Cach_Giua_Cac_Cua_Hang.xlsx', 'KhoangCachCH', rows);
  };

  const exportWarehouseDistances = () => {
    const rows = warehouseDistances.map(row => ({
      'Mã cửa hàng': row.storeId,
      'Tên cửa hàng': row.storeName,
      'Khoảng cách đến kho tổng (km)': row.distanceToWarehouse
    }));
    exportExcelFromRows('Khoang_Cach_CH_Den_Kho_Tong.xlsx', 'KhoangCachKhoTong', rows);
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
        <h3 style={{ marginTop: 0, color: '#333' }}>👕 Cấu hình Quần Áo (Kho Tổng):</h3>
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
      </div>

      <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>👞 Cấu hình Giày Dép:</h3>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '16px', color: '#555', fontWeight: '500' }}>
            Số lượng sản phẩm giày: 
            <input 
              type="number" 
              value={numShoesInput}
              onChange={(e) => {
                const val = e.target.value;
                setNumShoesInput(val);
                const parsed = parseInt(val, 10);
                if (Number.isFinite(parsed)) {
                  setNumShoes(Math.max(1, Math.round(parsed)));
                }
              }}
              onBlur={() => {
                const parsed = parseInt(numShoesInput, 10);
                const sanitized = Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : 1;
                setNumShoes(sanitized);
                setNumShoesInput(String(sanitized));
              }}
              min="1"
              style={{ marginLeft: '10px', padding: '8px', width: '100px', borderRadius: '4px', border: '2px solid #667eea', fontSize: '14px' }}
            />
          </label>
          <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px', border: '1px solid #ddd' }}>
            <p style={{ fontSize: '14px', color: '#333', marginTop: 0, marginBottom: '10px', fontWeight: '500' }}>Cấu hình SKC, Size & Loại:</p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '14px', color: '#555', fontWeight: '500' }}>
                Số SKC (màu):
                <input
                  type="number"
                  value={editShoeColorValue}
                  onChange={(e) => {
                    setEditShoeColorValue(e.target.value);
                    const parsed = parseInt(e.target.value, 10);
                    if (Number.isFinite(parsed)) {
                      const sanitized = Math.max(1, Math.min(colors.length, Math.round(parsed)));
                      setShoeColorsPerProduct(sanitized);
                    }
                  }}
                  min="1"
                  max={colors.length}
                  style={{ marginLeft: '8px', padding: '6px', width: '80px', borderRadius: '4px', border: '1px solid #667eea', fontSize: '13px' }}
                />
              </label>
              <label style={{ fontSize: '14px', color: '#555', fontWeight: '500' }}>
                Số Size:
                <input
                  type="number"
                  value={editShoeSizeValue}
                  onChange={(e) => updateShoeSizeValue(e.target.value)}
                  min="1"
                  max={shoePoolForType.length}
                  style={{ marginLeft: '8px', padding: '6px', width: '80px', borderRadius: '4px', border: '1px solid #667eea', fontSize: '13px' }}
                />
              </label>
              <label style={{ fontSize: '14px', color: '#555', fontWeight: '500' }}>
                Loại giày:
                <select
                  value={shoeGenderType}
                  onChange={(e) => setShoeGenderType(e.target.value as any)}
                  style={{ marginLeft: '8px', padding: '6px', borderRadius: '4px', border: '1px solid #667eea', fontSize: '13px' }}
                >
                  <option value="all">Tất cả (34-46)</option>
                  <option value="male">Nam (39-46)</option>
                  <option value="female">Nữ (34-41)</option>
                  <option value="kids">Trẻ em (28-36)</option>
                </select>
              </label>
              <div style={{ fontSize: '14px', color: '#667eea', fontWeight: '600', alignSelf: 'center' }}>
                = {shoeColorsPerProduct * shoeSizesPerColor} SKU/sản phẩm
              </div>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', marginBottom: '5px' }}>
            Tổng SKU giày sẽ tạo: <strong style={{ color: '#667eea' }}>{numShoes * shoeColorsPerProduct * shoeSizesPerColor}</strong>
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>🎒 Cấu hình Phụ Kiện:</h3>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '16px', color: '#555', fontWeight: '500' }}>
            Số lượng phụ kiện: 
            <input 
              type="number" 
              value={numAccessoriesInput}
              onChange={(e) => {
                const val = e.target.value;
                setNumAccessoriesInput(val);
                const parsed = parseInt(val, 10);
                if (Number.isFinite(parsed)) {
                  setNumAccessories(Math.max(1, Math.round(parsed)));
                }
              }}
              onBlur={() => {
                const parsed = parseInt(numAccessoriesInput, 10);
                const sanitized = Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : 1;
                setNumAccessories(sanitized);
                setNumAccessoriesInput(String(sanitized));
              }}
              min="1"
              style={{ marginLeft: '10px', padding: '8px', width: '100px', borderRadius: '4px', border: '2px solid #667eea', fontSize: '14px' }}
            />
          </label>
          <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '8px', border: '1px solid #ddd' }}>
            <p style={{ fontSize: '14px', color: '#333', marginTop: 0, marginBottom: '10px', fontWeight: '500' }}>Cấu hình SKC (màu):</p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '14px', color: '#555', fontWeight: '500' }}>
                Số màu:
                <input
                  type="number"
                  value={editAccessoryColorValue}
                  onChange={(e) => {
                    setEditAccessoryColorValue(e.target.value);
                    const parsed = parseInt(e.target.value, 10);
                    if (Number.isFinite(parsed)) {
                      const sanitized = Math.max(1, Math.min(colors.length, Math.round(parsed)));
                      setAccessoryColorsPerProduct(sanitized);
                    }
                  }}
                  min="1"
                  max={colors.length}
                  style={{ marginLeft: '8px', padding: '6px', width: '80px', borderRadius: '4px', border: '1px solid #667eea', fontSize: '13px' }}
                />
              </label>
              <div style={{ fontSize: '14px', color: '#667eea', fontWeight: '600', alignSelf: 'center' }}>
                = {accessoryColorsPerProduct} SKU/phụ kiện
              </div>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', marginBottom: '5px' }}>
            Tổng SKU phụ kiện sẽ tạo: <strong style={{ color: '#667eea' }}>{numAccessories * accessoryColorsPerProduct}</strong>
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button 
          onClick={generateData}
          className="btn-primary"
        >
          � Generate Quần Áo
        </button>

        <button 
          onClick={generateShoeData}
          className="btn-primary"
        >
          👞 Generate Giày Dép
        </button>

        <button 
          onClick={generateAccessoryData}
          className="btn-primary"
        >
          🎒 Generate Phụ Kiện
        </button>
      </div>

      {generatedData.length > 0 && (
        <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            onClick={exportMasterExcelTable}
            className="btn-export"
          >
            📊 Export Excel Kho Tổng (bảng hiển thị)
          </button>

          {shoeData.length > 0 && (
            <button 
              onClick={exportShoesExcelTable}
              className="btn-export"
            >
              📊 Export Excel Giày (bảng hiển thị)
            </button>
          )}

          {accessoryData.length > 0 && (
            <button 
              onClick={exportAccessoryExcelTable}
              className="btn-export"
            >
              📊 Export Excel Phụ Kiện (bảng hiển thị)
            </button>
          )}
        </div>
      )}

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

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={generateStoreData}
            className="btn-primary"
          >
            🏬 Generate Data Cửa Hàng
          </button>

          <button
            onClick={generateStoreShoesFromMaster}
            className="btn-primary"
            disabled={shoeData.length === 0}
            style={{ opacity: shoeData.length === 0 ? 0.5 : 1, cursor: shoeData.length === 0 ? 'not-allowed' : 'pointer' }}
          >
            👞 Generate Giày cho Cửa Hàng (từ kho giày)
          </button>

          <button
            onClick={generateStoreAccessoriesFromMaster}
            className="btn-primary"
            disabled={accessoryData.length === 0}
            style={{ opacity: accessoryData.length === 0 ? 0.5 : 1, cursor: accessoryData.length === 0 ? 'not-allowed' : 'pointer' }}
          >
            🎒 Generate Phụ Kiện cho Cửa Hàng (từ kho phụ kiện)
          </button>
        </div>

        {storeData.length > 0 && (
          <>
            <button
              onClick={exportStoreClothingTable}
              className="btn-export"
              disabled={selectedStores.size === 0}
              style={{ opacity: selectedStores.size === 0 ? 0.5 : 1, cursor: selectedStores.size === 0 ? 'not-allowed' : 'pointer', marginRight: '8px' }}
            >
              📊 Export Excel Cửa Hàng (Quần Áo - bảng hiển thị)
            </button>
            <button
              onClick={exportStoreShoesTable}
              className="btn-export"
              disabled={selectedStores.size === 0}
              style={{ opacity: selectedStores.size === 0 ? 0.5 : 1, cursor: selectedStores.size === 0 ? 'not-allowed' : 'pointer', marginRight: '8px' }}
            >
              👞 Export Excel Cửa Hàng (Giày - bảng hiển thị)
            </button>
            <button
              onClick={exportStoreAccessoriesTable}
              className="btn-export"
              disabled={selectedStores.size === 0 || storeData.every(row => !row.loaiPhuKien || row.loaiPhuKien.trim() === '')}
              style={{ opacity: selectedStores.size === 0 || storeData.every(row => !row.loaiPhuKien || row.loaiPhuKien.trim() === '') ? 0.5 : 1, cursor: selectedStores.size === 0 || storeData.every(row => !row.loaiPhuKien || row.loaiPhuKien.trim() === '') ? 'not-allowed' : 'pointer' }}
            >
              🎒 Export Excel Cửa Hàng (Phụ Kiện - bảng hiển thị)
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
                  <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Thuộc tính</th>
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
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.thuocTinh}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: '600', color: '#667eea' }}>{row.tonHienTai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AttributeSummary data={generatedData} />
        </div>
      )}

      {shoeData.length > 0 && (
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '20px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
          <h3 style={{ color: '#333', marginTop: 0 }}>Dữ liệu giày dép ({shoeData.length} SKU):</h3>
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
                  <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Thuộc tính</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn hiện tại</th>
                </tr>
              </thead>
              <tbody>
                {shoeData.map((row, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.maHang}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.maMau}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.mauChiTiet}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{row.size}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.namGop}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.thuocTinh}</td>
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
              onClick={exportMergedExcel}
              className="btn-export"
              style={{ marginRight: '8px' }}
            >
              📊 Export Excel (Kho + Gen: {uploadedData.length + generatedData.length} SKU)
            </button>
            <button
              onClick={() => {
                const rows = uploadedData.map(row => ({
                  'Mã hàng': row.maHang,
                  'Mã màu': row.maMau,
                  'Màu chi tiết': row.mauChiTiet,
                  'Size': row.size,
                  'Năm gộp': row.namGop,
                  'Thuộc tính': row.thuocTinh,
                  'Tồn hiện tại': row.tonHienTai,
                }));
                exportExcelFromRows('Kho_Upload_Bang_Hien_Thi.xlsx', 'KhoUpload', rows);
              }}
              className="btn-export"
            >
              📊 Export Excel (Bảng upload hiển thị)
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
                  <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Thuộc tính</th>
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
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.thuocTinh}</td>
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
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.thuocTinh}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: '600', color: '#667eea' }}>{row.tonHienTai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {accessoryData.length > 0 && (
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '20px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
          <h3 style={{ color: '#333', marginTop: 0 }}>Dữ liệu phụ kiện ({accessoryData.length} SKU):</h3>
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
                  <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Loại phụ kiện</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Màu chi tiết</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Năm gộp</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Thuộc tính</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn hiện tại</th>
                </tr>
              </thead>
              <tbody>
                {accessoryData.map((row, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.maHang}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.maMau}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.loaiPhuKien}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.mauChiTiet}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.namGop}</td>
                    <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.thuocTinh}</td>
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
          {(() => {
            const shoeData = storeData.filter(row => !row.loaiPhuKien && parseInt(row.maHang) >= 7000000 && parseInt(row.maHang) < 8000000);
            const clothingOnly = storeData.filter(row => !row.loaiPhuKien && (parseInt(row.maHang) < 7000000 || parseInt(row.maHang) >= 8000000));
            const accessoriesData = storeData.filter(row => row.loaiPhuKien && row.loaiPhuKien.trim() !== '');

            return (
              <>
                {clothingOnly.length > 0 && (
                  <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '20px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ color: '#333', marginTop: 0 }}>Quần áo tất cả cửa hàng ({clothingOnly.length} SKU)</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tên VT</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Mã cửa hàng</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Diện tích</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>SKC Limit</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>SKC Trưng bày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Mã hàng</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Mã màu</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Màu chi tiết</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Size</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Năm gộp</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Thuộc tính</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Vùng miền</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Bán 90 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Bán 60 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Bán 30 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Bán 14 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Bán 7 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn 90 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn 60 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn 30 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn 14 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn 7 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn hiện tại</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>MOH</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clothingOnly.map((row, index) => (
                            <tr key={row.maHang + row.maMau + row.storeId} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.storeName}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.storeId}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.dienTich}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#007acc' }}>{row.skcLimit}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#d9534f' }}>{row.skcDisplay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.maHang}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.maMau}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.mauChiTiet}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{row.size}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.namGop}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.thuocTinh}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.vungMien}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{row.ban90Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{row.ban60Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{row.ban30Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{row.ban14Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{row.ban7Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{row.ton90Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{row.ton60Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{row.ton30Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{row.ton14Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{row.ton7Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: '600', color: '#667eea' }}>{row.tonHienTai}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: '600', color: '#f59e0b' }}>{row.moh.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <AttributeSummary data={clothingOnly} />
                    <StoreSizeAnalysis data={clothingOnly} />
                  </div>
                )}

                {shoeData.length > 0 && (
                  <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '20px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ color: '#333', marginTop: 0 }}>Giày dép tất cả cửa hàng ({shoeData.length} SKU)</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tên VT</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Mã cửa hàng</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Diện tích</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>SKC Limit</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>SKC Trưng bày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Mã hàng</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Mã màu</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Màu chi tiết</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Size</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Năm gộp</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Thuộc tính</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Vùng miền</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Bán 90 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Bán 60 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Bán 30 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Bán 14 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Bán 7 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn 90 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn 60 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn 30 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn 14 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn 7 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn hiện tại</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>MOH</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shoeData.map((row, index) => (
                            <tr key={row.maHang + row.maMau + row.storeId} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.storeName}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.storeId}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.dienTich}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#007acc' }}>{row.skcLimit}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#d9534f' }}>{row.skcDisplay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.maHang}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.maMau}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.mauChiTiet}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{row.size}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.namGop}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.thuocTinh}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.vungMien}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{row.ban90Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{row.ban60Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{row.ban30Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{row.ban14Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{row.ban7Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{row.ton90Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{row.ton60Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{row.ton30Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{row.ton14Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{row.ton7Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: '600', color: '#667eea' }}>{row.tonHienTai}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: '600', color: '#f59e0b' }}>{row.moh.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <AttributeSummary data={shoeData} />
                    <StoreSizeAnalysis data={shoeData} />
                  </div>
                )}

                {accessoriesData.length > 0 && (
                  <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '20px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ color: '#333', marginTop: 0 }}>Phụ kiện tất cả cửa hàng ({accessoriesData.length} SKU)</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tên VT</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Mã cửa hàng</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Diện tích</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>SKC Limit</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>SKC Trưng bày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Mã hàng</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Mã màu</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Loại phụ kiện</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Màu chi tiết</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Năm gộp</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Thuộc tính</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Vùng miền</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Bán 90 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Bán 60 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Bán 30 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Bán 14 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Bán 7 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn 90 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn 60 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn 30 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn 14 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn 7 ngày</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tồn hiện tại</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>MOH</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accessoriesData.map((row, index) => (
                            <tr key={row.maHang + row.maMau + row.storeId} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.storeName}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.storeId}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.dienTich}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#007acc' }}>{row.skcLimit}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#d9534f' }}>{row.skcDisplay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.maHang}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.maMau}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.loaiPhuKien}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.mauChiTiet}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.namGop}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.thuocTinh}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.vungMien}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{row.ban90Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{row.ban60Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{row.ban30Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{row.ban14Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>{row.ban7Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{row.ton90Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{row.ton60Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{row.ton30Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{row.ton14Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{row.ton7Ngay}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: '600', color: '#667eea' }}>{row.tonHienTai}</td>
                              <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: '600', color: '#f59e0b' }}>{row.moh.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <AttributeSummary data={accessoriesData} />
                    <StoreSizeAnalysis data={accessoriesData} />
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Distance Data Section */}
      <div style={{ marginBottom: '20px', padding: '20px', backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>📍 Khoảng Cách</h3>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '15px' }}>
          <button
            onClick={generateStoreDistances}
            className="btn-generate"
            style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}
          >
            📏 Gen khoảng cách giữa các cửa hàng
          </button>
          
          <button
            onClick={generateWarehouseDistances}
            className="btn-generate"
            style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}
          >
            🏭 Gen khoảng cách cửa hàng đến kho tổng
          </button>
        </div>

        {storeDistances.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ color: '#333', margin: 0 }}>Khoảng cách giữa các cửa hàng ({storeDistances.length} kết nối)</h4>
              <button onClick={exportStoreDistances} className="btn-export">
                📥 Export Excel
              </button>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                    <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Từ CH (Mã)</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Từ CH (Tên)</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Đến CH (Mã)</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Đến CH (Tên)</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Khoảng cách (km)</th>
                  </tr>
                </thead>
                <tbody>
                  {storeDistances.map((row, index) => (
                    <tr key={`${row.fromStoreId}-${row.toStoreId}-${index}`} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.fromStoreId}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.fromStoreName}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.toStoreId}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.toStoreName}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: '600', color: '#f5576c' }}>{row.distance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {warehouseDistances.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ color: '#333', margin: 0 }}>Khoảng cách từ cửa hàng đến kho tổng ({warehouseDistances.length} cửa hàng)</h4>
              <button onClick={exportWarehouseDistances} className="btn-export">
                📥 Export Excel
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                    <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Mã cửa hàng</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Tên cửa hàng</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', fontWeight: '600' }}>Khoảng cách đến kho tổng (km)</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouseDistances.map((row, index) => (
                    <tr key={row.storeId} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.storeId}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{row.storeName}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: '600', color: '#00f2fe' }}>{row.distanceToWarehouse}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
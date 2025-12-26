import React from 'react';

export interface StoreDataRow {
  storeId: string;
  storeName: string;
  maHang: string;
  maMau: string;
  size?: string;
  [key: string]: any;
}

export interface StoreSKCStats {
  storeId: string;
  storeName: string;
  totalSKC: number; // Tổng số SKC (mẫu + màu)
  totalSKU: number; // Tổng số SKU (mẫu + màu + size)
  uniqueProducts: number; // Số mẫu (maHang) unique
  avgColorsPerProduct: number; // Trung bình số màu/mẫu
}

/**
 * Phân tích SKC (mẫu + màu) cho mỗi cửa hàng
 * @param data Dữ liệu store với maHang, maMau, size
 * @returns Danh sách thống kê SKC theo từng cửa hàng
 */
export const calculateStoreSKC = (data: StoreDataRow[]): StoreSKCStats[] => {
  const storeMap = new Map<string, {
    storeName: string;
    skcs: Set<string>; // set of "maHang-maMau"
    skus: Set<string>; // set of "maHang-maMau-size"
    products: Set<string>; // set of "maHang"
  }>();

  // Thu thập dữ liệu cho mỗi cửa hàng
  data.forEach(row => {
    if (!storeMap.has(row.storeId)) {
      storeMap.set(row.storeId, {
        storeName: row.storeName,
        skcs: new Set(),
        skus: new Set(),
        products: new Set(),
      });
    }

    const store = storeMap.get(row.storeId)!;
    
    // SKC = maHang + maMau
    const skc = `${row.maHang}-${row.maMau}`;
    store.skcs.add(skc);
    
    // SKU = maHang + maMau + size
    const sku = `${row.maHang}-${row.maMau}-${row.size || 'NO_SIZE'}`;
    store.skus.add(sku);
    
    // Product = maHang
    store.products.add(row.maHang);
  });

  // Tạo danh sách thống kê
  const stats: StoreSKCStats[] = [];
  storeMap.forEach((value, storeId) => {
    const totalSKC = value.skcs.size;
    const uniqueProducts = value.products.size;
    
    stats.push({
      storeId,
      storeName: value.storeName,
      totalSKC,
      totalSKU: value.skus.size,
      uniqueProducts,
      avgColorsPerProduct: uniqueProducts > 0 ? totalSKC / uniqueProducts : 0,
    });
  });

  // Sắp xếp theo storeId
  return stats.sort((a, b) => a.storeId.localeCompare(b.storeId));
};

/**
 * Component hiển thị thống kê SKC theo cửa hàng
 */
export const SKCAnalysisSummary: React.FC<{ data: StoreDataRow[] }> = ({ data }) => {
  if (data.length === 0) return null;

  const stats = calculateStoreSKC(data);

  return (
    <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
      <h3 style={{ marginTop: 0, color: '#333' }}>📊 Phân tích SKC theo Cửa hàng</h3>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
        SKC = Mẫu + Màu (không tính size). Số SKC phải nhỏ hơn hoặc bằng tổng số mẫu × số màu.
      </p>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#007acc', color: 'white' }}>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #005a9e' }}>Cửa hàng</th>
              <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #005a9e' }}>Số Mẫu</th>
              <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #005a9e' }}>Số SKC</th>
              <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #005a9e' }}>Số SKU</th>
              <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #005a9e' }}>TB Màu/Mẫu</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat, idx) => (
              <tr key={stat.storeId} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f5f5f5' }}>
                <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                  <strong>{stat.storeId}</strong> - {stat.storeName}
                </td>
                <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>
                  {stat.uniqueProducts}
                </td>
                <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd', fontWeight: 'bold', color: '#007acc' }}>
                  {stat.totalSKC}
                </td>
                <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>
                  {stat.totalSKU}
                </td>
                <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>
                  {stat.avgColorsPerProduct.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e8f4f8', borderRadius: '5px', fontSize: '13px' }}>
        <strong>💡 Ghi chú:</strong>
        <ul style={{ marginTop: '5px', marginBottom: 0, paddingLeft: '20px' }}>
          <li><strong>Số Mẫu</strong>: Số lượng mã hàng (maHang) unique</li>
          <li><strong>Số SKC</strong>: Số lượng tổ hợp mẫu + màu (maHang + maMau)</li>
          <li><strong>Số SKU</strong>: Số lượng tổ hợp mẫu + màu + size (maHang + maMau + size)</li>
          <li><strong>TB Màu/Mẫu</strong>: Trung bình số màu cho mỗi mẫu = SKC / Số Mẫu</li>
        </ul>
      </div>
    </div>
  );
};

export default SKCAnalysisSummary;

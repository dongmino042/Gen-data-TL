import React from 'react';

export interface StoreRow {
  maHang: string;
  maMau: string;
  storeId: string;
  storeName: string;
  dienTich: string;
  mauChiTiet: string;
  size: string;
  namGop: string;
  thuocTinh: 'Nóng' | 'Lạnh' | 'Trung Tính';
  vungMien: string;
  ban90Ngay: number;
  ban60Ngay: number;
  ban30Ngay: number;
  ban14Ngay: number;
  ban7Ngay: number;
  tonHienTai: number;
  banTbQ1?: number;
  banTbQ2?: number;
  banTbQ3?: number;
  banTbQ4?: number;
  loaiPhuKien?: string;
}

export type SizeCountRow = {
  maHang: string;
  maMau: string;
  size?: string;
};

// Tính dải giá trị (min/max/avg) cho mỗi size theo từng cửa hàng
export const calculateSizeRangesByStore = (data: StoreRow[]) => {
  const storeStats: Record<string, Record<string, { min: number; max: number; avg: number; count: number }>> = {};
  
  data.forEach(row => {
    if (!storeStats[row.storeId]) {
      storeStats[row.storeId] = {};
    }
    
    const size = row.size?.trim() || 'NO_SIZE';
    
    if (!storeStats[row.storeId][size]) {
      storeStats[row.storeId][size] = { min: Infinity, max: 0, avg: 0, count: 0 };
    }
    
    // Tính bán hàng - nếu tất cả đều 0 thì trung bình = 0
    const values = [row.ban7Ngay, row.ban14Ngay, row.ban30Ngay, row.ban60Ngay, row.ban90Ngay];
    const validValues = values.filter(v => v > 0);
    
    if (validValues.length > 0) {
      // Có ít nhất 1 mốc bán > 0
      const avg = validValues.reduce((a, b) => a + b, 0) / validValues.length;
      storeStats[row.storeId][size].min = Math.min(storeStats[row.storeId][size].min, ...validValues);
      storeStats[row.storeId][size].max = Math.max(storeStats[row.storeId][size].max, ...validValues);
      storeStats[row.storeId][size].avg += avg;
      storeStats[row.storeId][size].count += 1;
    } else {
      // Tất cả bán = 0, nhưng size vẫn tồn tại
      storeStats[row.storeId][size].avg += 0;
      storeStats[row.storeId][size].count += 1;
    }
  });

  // Tính trung bình của avg
  Object.keys(storeStats).forEach(storeId => {
    Object.keys(storeStats[storeId]).forEach(size => {
      if (storeStats[storeId][size].count > 0) {
        storeStats[storeId][size].avg = Math.round(storeStats[storeId][size].avg / storeStats[storeId][size].count);
      }
    });
  });

  return storeStats;
};

// Tính số SKU duy nhất (kho tổng) cho mỗi size
export const calculateAttributeRanges = (data: SizeCountRow[]) => {
  const sizeStats: Record<string, { count: number }> = {};
  let noSizeCount = 0;
  const seen = new Set<string>();

  data.forEach(row => {
    const key = `${row.maHang}-${row.maMau}-${row.size || 'NO_SIZE'}`;
    if (seen.has(key)) return; // chỉ tính mỗi SKU một lần (kho tổng)
    seen.add(key);

    const size = row.size?.trim();
    if (!size) {
      noSizeCount += 1;
      return;
    }

    if (!sizeStats[size]) {
      sizeStats[size] = { count: 0 };
    }
    sizeStats[size].count += 1;
  });

  return { sizeStats, noSizeCount, totalCount: seen.size };
};

// Component hiển thị summary dải giá trị theo size
export const AttributeSummary: React.FC<{ data: SizeCountRow[] }> = ({ data }) => {
  if (data.length === 0) return null;

  const { sizeStats, noSizeCount, totalCount } = calculateAttributeRanges(data);
  const totalSized = totalCount - noSizeCount;

  return (
    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>📊 Dải size kho tổng: (Tổng {totalCount} SKU)</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {Object.entries(sizeStats).map(([size, stats]) => (
          <div key={size} style={{ padding: '12px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #ddd', textAlign: 'center' }}>
            <div style={{ fontWeight: '600', color: '#667eea', marginBottom: '6px', fontSize: '16px' }}>Size: {size}</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b' }}>{stats.count} SKU</div>
          </div>
        ))}
        {noSizeCount > 0 && (
          <div style={{ padding: '12px', backgroundColor: '#ffe0e0', borderRadius: '6px', border: '1px solid #ffcccc', textAlign: 'center' }}>
            <div style={{ fontWeight: '600', color: '#d32f2f', marginBottom: '6px', fontSize: '16px' }}>Không có size</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#d32f2f' }}>{noSizeCount} SKU</div>
          </div>
        )}
      </div>
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        Có size: {totalSized} / Thiếu size: {noSizeCount}
      </div>
    </div>
  );
};

// Component hiển thị dải size theo từng cửa hàng (để phát hiện gãy size)
export const StoreSizeAnalysis: React.FC<{ data: StoreRow[] }> = ({ data }) => {
  if (data.length === 0) return null;

  const storeRanges = calculateSizeRangesByStore(data);
  
  // Lấy tất cả size có sẵn
  const allSizes = new Set<string>();
  Object.values(storeRanges).forEach(storeData => {
    Object.keys(storeData).forEach(size => allSizes.add(size));
  });
  const sortedSizes = Array.from(allSizes).sort();

  return (
    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>📊 Dải size cửa hàng:</h4>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#667eea', color: 'white' }}>
              <th style={{ padding: '8px', border: '1px solid #ddd', fontWeight: '600' }}>Cửa hàng</th>
              {sortedSizes.map(size => (
                <th key={size} style={{ padding: '8px', border: '1px solid #ddd', fontWeight: '600', textAlign: 'center' }}>
                  {size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(storeRanges).map(([storeId, sizeData]) => (
              <tr key={storeId} style={{ backgroundColor: '#ffffff' }}>
                <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: '600' }}>
                  {data.find(d => d.storeId === storeId)?.storeName || storeId}
                </td>
                {sortedSizes.map(size => {
                  const stat = sizeData[size];
                  const hasSize = !!stat;
                  return (
                    <td
                      key={size}
                      style={{
                        padding: '8px',
                        border: '1px solid #ddd',
                        textAlign: 'center',
                        backgroundColor: hasSize ? '#e8f5e9' : '#ffebee',
                        fontWeight: '600',
                        color: hasSize ? '#2e7d32' : '#c62828'
                      }}
                    >
                      {hasSize ? `✓ (${stat.avg})` : '✗ Gãy'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

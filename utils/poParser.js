exports.parsePurchaseOrderText = (text) => {
  const extract = (regex, fallback = '') => {
    const match = text.match(regex);
    return match ? match[1].trim() : fallback;
  };

  const extractItems = () => {
    const lines = text.split('\n').filter(Boolean);
    const items = [];

    const countRegex = /(\d{2})\s?[sS]|\b(\d{2})\s?\/\s?1\b|count\s*[:\-]?\s*(\d{2})/i;

    for (const line of lines) {
      if (line.toLowerCase().includes('yarn') || line.toLowerCase().includes('cotton')) {
        const countMatch = line.match(countRegex);
        items.push({
          orderCode: extract(/Order(?:\s*Code)?[:\-\s]*([A-Z0-9]+)/i, 'N/A'),
          yarnDescription: line.trim(),
          color: 'N/A',
          count: countMatch ? parseInt(countMatch[1] || countMatch[2] || countMatch[3]) : 0,
          uom: 'Kgs',
          bagCount: 0,
          quantity: parseFloat(extract(/(?:Qty|Quantity)[:\-\s]*([\d.]+)/i, '0')),
          rate: parseFloat(extract(/(?:Rate|Price)[/\s]*([\d.]+)/i, '0')),
          gstPercent: 0,
          taxableAmount: parseFloat(extract(/(?:Amount|Total)[/\s]*([\d.]+)/i, '0')),
          shadeNo: extract(/Shade\s*No[:\-\s]*([A-Za-z0-9]+)/i, 'N/A')
        });
      }
    }

    return items;
  };

  return {
    poNumber: extract(/PO\s*No[:\-\s]*([A-Za-z0-9]+)/i),
    poDate: extract(/Date[:\-\s]*(\d{2}\/\d{2}\/\d{4})/i),
    buyerName: extract(/To[:\-\s]*(.*)/i),
    supplierName: extract(/From[:\-\s]*(.*)/i),
    deliveryAddress: extract(/Delivery\s*Address[:\-\s]*(.*)/i),
    grandTotal: parseFloat(extract(/Total[:\-\s]*([\d.]+)/i, '0')),
    items: extractItems(),
    buyerGstNo: extract(/GST\s*[:\-\s]*(\w{15})/),
    buyerEmail: extract(/Email[:\-\s]*([\w.@]+)/i),
    buyerPhone: extract(/Ph[:\-\s]*([\d\s]+)/i),
    notes: '',
    paymentTerms: '',
    buyerPanNo: 'N/A',
    amountInWords: 'N/A'
  };
};
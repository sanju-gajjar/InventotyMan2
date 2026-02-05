/**
 * Tenant Configuration System
 * Defines business types and their specific schemas/fields
 */

const businessTypes = {
  mobile: {
    name: "Mobile & Accessories Shop",
    displayName: "Mobile Shop",
    logo: "📱",
    theme: {
      primaryColor: "#044767",
      secondaryColor: "#1b9ba3",
      accentColor: "#0891b2",
      headerBg: "#044767",
      footerBg: "#1b9ba3"
    },
    collections: {
      stocks: {
        fields: [
          { name: "Brand", type: "string", required: true, visible: true },
          { name: "Category", type: "string", required: true, visible: true },
          { name: "ItemId", type: "string", required: true, unique: true, visible: true },
          { name: "ItemName", type: "string", required: true, visible: true },
          { name: "Size", type: "number", required: true, visible: true }, // Stock quantity
          { name: "SerialNumber", type: "string", required: false, visible: true },
          { name: "Price", type: "number", required: true, visible: true },
          { name: "updatedDate", type: "date", default: "Date.now", visible: false }
        ]
      },
      orders: {
        fields: [
          { name: "CustomerName", type: "string", required: true, visible: true },
          { name: "PhoneNo", type: "string", required: true, visible: true },
          { name: "MailId", type: "string", required: false, visible: true },
          { name: "Address", type: "string", required: false, visible: true },
          { name: "Brand", type: "string", required: true, visible: true },
          { name: "Category", type: "string", required: true, visible: true },
          { name: "ItemId", type: "string", required: true, visible: true },
          { name: "ItemName", type: "string", required: true, visible: true },
          { name: "Quantity", type: "number", required: true, visible: true },
          { name: "SerialNumber", type: "string", required: false, visible: true },
          { name: "Price", type: "number", required: true, visible: true },
          { name: "Discount", type: "number", required: false, default: 0, visible: true },
          { name: "GST", type: "number", required: false, default: 0, visible: true },
          { name: "Amount", type: "number", required: true, visible: true },
          { name: "Date", type: "date", default: "Date.now", visible: false }
        ]
      }
    },
    dashboardMetrics: ["outOfStock", "lowStock", "fastMoving", "slowMoving"]
  },

  restaurant: {
    name: "Restaurant / Food Shop",
    displayName: "Restaurant",
    logo: "🍽️",
    theme: {
      primaryColor: "#dc2626",
      secondaryColor: "#f59e0b",
      accentColor: "#ea580c",
      headerBg: "#dc2626",
      footerBg: "#f59e0b"
    },
    collections: {
      stocks: {
        fields: [
          { name: "Category", type: "string", required: true, visible: true }, // Veg, Non-Veg, Beverages, etc.
          { name: "ItemId", type: "string", required: true, unique: true, visible: true },
          { name: "ItemName", type: "string", required: true, visible: true },
          { name: "Size", type: "number", required: true, visible: true }, // Stock quantity
          { name: "Unit", type: "string", required: true, visible: true }, // kg, liter, pieces
          { name: "Price", type: "number", required: true, visible: true },
          { name: "ExpiryDate", type: "date", required: false, visible: true },
          { name: "updatedDate", type: "date", default: "Date.now", visible: false }
        ]
      },
      orders: {
        fields: [
          { name: "CustomerName", type: "string", required: false, visible: true },
          { name: "PhoneNo", type: "string", required: false, visible: true },
          { name: "TableNo", type: "string", required: false, visible: true },
          { name: "OrderType", type: "string", required: true, visible: true }, // Dine-in, Takeaway, Delivery
          { name: "Category", type: "string", required: true, visible: true },
          { name: "ItemId", type: "string", required: true, visible: true },
          { name: "ItemName", type: "string", required: true, visible: true },
          { name: "Quantity", type: "number", required: true, visible: true },
          { name: "Unit", type: "string", required: true, visible: true },
          { name: "Price", type: "number", required: true, visible: true },
          { name: "Discount", type: "number", required: false, default: 0, visible: true },
          { name: "GST", type: "number", required: false, default: 5, visible: true },
          { name: "Amount", type: "number", required: true, visible: true },
          { name: "Date", type: "date", default: "Date.now", visible: false }
        ]
      }
    },
    dashboardMetrics: ["freshness", "popularItems", "orderTypeTrends", "wasteTracking"]
  },

  clothing: {
    name: "Clothing Store",
    displayName: "Clothing Store",
    logo: "👔",
    theme: {
      primaryColor: "#7c3aed",
      secondaryColor: "#ec4899",
      accentColor: "#a855f7",
      headerBg: "#7c3aed",
      footerBg: "#ec4899"
    },
    collections: {
      stocks: {
        fields: [
          { name: "Brand", type: "string", required: false, visible: true },
          { name: "Category", type: "string", required: true, visible: true }, // Men, Women, Kids
          { name: "SubCategory", type: "string", required: true, visible: true }, // Shirt, Pant, Dress, etc.
          { name: "ItemId", type: "string", required: true, unique: true, visible: true },
          { name: "ItemName", type: "string", required: true, visible: true },
          { name: "Size", type: "number", required: true, visible: true }, // Stock quantity
          { name: "ClothSize", type: "string", required: true, visible: true }, // S, M, L, XL, XXL
          { name: "Color", type: "string", required: false, visible: true },
          { name: "Price", type: "number", required: true, visible: true },
          { name: "updatedDate", type: "date", default: "Date.now", visible: false }
        ]
      },
      orders: {
        fields: [
          { name: "CustomerName", type: "string", required: true, visible: true },
          { name: "PhoneNo", type: "string", required: true, visible: true },
          { name: "MailId", type: "string", required: false, visible: true },
          { name: "Address", type: "string", required: false, visible: true },
          { name: "Brand", type: "string", required: false, visible: true },
          { name: "Category", type: "string", required: true, visible: true },
          { name: "SubCategory", type: "string", required: true, visible: true },
          { name: "ItemId", type: "string", required: true, visible: true },
          { name: "ItemName", type: "string", required: true, visible: true },
          { name: "Quantity", type: "number", required: true, visible: true },
          { name: "ClothSize", type: "string", required: true, visible: true },
          { name: "Color", type: "string", required: false, visible: true },
          { name: "Price", type: "number", required: true, visible: true },
          { name: "Discount", type: "number", required: false, default: 0, visible: true },
          { name: "GST", type: "number", required: false, default: 0, visible: true },
          { name: "Amount", type: "number", required: true, visible: true },
          { name: "Date", type: "date", default: "Date.now", visible: false }
        ]
      }
    },
    dashboardMetrics: ["outOfStock", "lowStock", "fastMoving", "slowMoving", "sizeDistribution"]
  }
};

module.exports = {
  businessTypes,
  getBusinessType: (type) => businessTypes[type] || businessTypes.mobile
};

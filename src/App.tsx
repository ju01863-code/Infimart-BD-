import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Product,
  Order,
  Purchase,
  Transaction,
  Customer,
  GiftRecord,
  StoreSettings,
  Supplier,
  Category,
  Offer,
  ComboPackage,
  PreBookingCampaign,
  PreBookingOrder,
  DailyDeal,
  SpecialOffer,
  ProductReview,
} from './types';
import { DEFAULT_SETTINGS, INITIAL_CATEGORIES, INITIAL_PRODUCTS, INITIAL_CUSTOMERS, STANDARD_CATEGORY_ORDER } from './data/seedData';
import { deleteProductImageFromStorage } from './utils/imageCompressor';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CustomerStore } from './components/CustomerStore';
import { AdminPanel } from './components/AdminPanel';

export default function App() {
  // Determine initial view based on URL / page flag
  const [currentView, setCurrentView] = useState<'store' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const isWindowAdmin =
        (window as unknown as { INFIMART_PAGE?: string; FENI_MART_PAGE?: string }).INFIMART_PAGE === 'admin' ||
        (window as unknown as { INFIMART_PAGE?: string; FENI_MART_PAGE?: string }).FENI_MART_PAGE === 'admin';
      const isPathAdmin = window.location.pathname.includes('admin');
      const isSearchAdmin = window.location.search.includes('admin') || window.location.hash.includes('admin');
      return isWindowAdmin || isPathAdmin || isSearchAdmin ? 'admin' : 'store';
    }
    return 'store';
  });

  // State collections
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [giftRecords, setGiftRecords] = useState<GiftRecord[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [packages, setPackages] = useState<ComboPackage[]>([]);
  const [preBookingCampaigns, setPreBookingCampaigns] = useState<PreBookingCampaign[]>([]);
  const [preBookingOrders, setPreBookingOrders] = useState<PreBookingOrder[]>([]);
  const [dailyDeals, setDailyDeals] = useState<DailyDeal[]>([]);
  const [specialOffers, setSpecialOffers] = useState<SpecialOffer[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [storeCategory, setStoreCategory] = useState<string>('সব');

  // Sync view changes to URL history
  const handleViewChange = (view: 'store' | 'admin') => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (view === 'admin') {
        url.searchParams.set('page', 'admin');
      } else {
        url.searchParams.delete('page');
      }
      window.history.pushState({}, '', url.toString());
    }
  };

  // 1. Subscribe to Firestore settings/contact & settings/admin
  useEffect(() => {
    const settingsDocRef = doc(db, 'settings', 'contact');
    const adminDocRef = doc(db, 'settings', 'admin');

    // One-time admin password reset to "Jj0558949360" in Firestore settings/admin
    const resetFlag = localStorage.getItem('infimart_admin_pw_reset_v2026_jj0558949360');
    if (resetFlag !== 'done') {
      setDoc(
        adminDocRef,
        { password: 'Jj0558949360', updatedAt: new Date().toISOString() },
        { merge: true }
      )
        .then(() => {
          localStorage.setItem('infimart_admin_pw_reset_v2026_jj0558949360', 'done');
        })
        .catch((err) => console.warn('Could not reset settings/admin doc:', err));

      setDoc(
        settingsDocRef,
        { storeName: 'InfiMart BD', password: 'Jj0558949360' },
        { merge: true }
      ).catch(() => {});
    }

    const unsubContact = onSnapshot(
      settingsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const contactData = docSnap.data() as StoreSettings;
          setSettings((prev) => ({
            ...prev,
            ...contactData,
            storeName: contactData.storeName || 'InfiMart BD',
            // Keep password controlled by settings/admin
            password: prev.password || contactData.password || 'Jj0558949360',
          }));
        } else {
          // Initialize settings document if it doesn't exist
          setDoc(settingsDocRef, DEFAULT_SETTINGS).catch((err) =>
            console.warn('Could not auto-seed settings doc:', err)
          );
        }
      },
      (err) => console.warn('Settings contact listener error:', err)
    );

    const unsubAdmin = onSnapshot(
      adminDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data?.password) {
            setSettings((prev) => ({
              ...prev,
              password: data.password,
            }));
          }
        } else {
          // Ensure settings/admin always exists with Jj0558949360
          setDoc(
            adminDocRef,
            { password: 'Jj0558949360', updatedAt: new Date().toISOString() },
            { merge: true }
          ).catch((err) => console.warn('Could not seed settings/admin:', err));
        }
      },
      (err) => console.warn('Settings admin listener error:', err)
    );

    return () => {
      unsubContact();
      unsubAdmin();
    };
  }, []);

  // 2. Subscribe to Firestore products (strictly real data, NO demo data)
  useEffect(() => {
    const productsCol = collection(db, 'products');
    const unsub = onSnapshot(
      productsCol,
      (snapshot) => {
        const list: Product[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Product);
        });
        setProducts(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Products listener error:', err);
        setLoading(false);
        setProducts([]);
      }
    );
    return () => unsub();
  }, []);

  // 3. Subscribe to Firestore orders
  useEffect(() => {
    const ordersCol = collection(db, 'orders');
    const unsub = onSnapshot(
      ordersCol,
      (snapshot) => {
        const list: Order[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Order);
        });
        list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setOrders(list);
      },
      (err) => console.warn('Orders listener error:', err)
    );
    return () => unsub();
  }, []);

  // 4. Subscribe to Firestore purchases
  useEffect(() => {
    const purchasesCol = collection(db, 'purchases');
    const unsub = onSnapshot(
      purchasesCol,
      (snapshot) => {
        const list: Purchase[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Purchase);
        });
        list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setPurchases(list);
      },
      (err) => console.warn('Purchases listener error:', err)
    );
    return () => unsub();
  }, []);

  // 5. Subscribe to Firestore transactions (income & expense)
  useEffect(() => {
    const txCol = collection(db, 'transactions');
    const unsub = onSnapshot(
      txCol,
      (snapshot) => {
        const list: Transaction[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Transaction);
        });
        list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setTransactions(list);
      },
      (err) => console.warn('Transactions listener error:', err)
    );
    return () => unsub();
  }, []);

  // 6. Subscribe to Firestore customers
  useEffect(() => {
    const custCol = collection(db, 'customers');
    const unsub = onSnapshot(
      custCol,
      async (snapshot) => {
        if (snapshot.empty) {
          try {
            for (const cust of INITIAL_CUSTOMERS) {
              await addDoc(custCol, cust);
            }
          } catch (err) {
            console.warn('Failed to seed customers:', err);
          }
          return;
        }

        const list: Customer[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Customer);
        });
        setCustomers(list);
      },
      (err) => console.warn('Customers listener error:', err)
    );
    return () => unsub();
  }, []);

  // 7. Subscribe to Firestore gifts
  useEffect(() => {
    const giftsCol = collection(db, 'gifts');
    const unsub = onSnapshot(
      giftsCol,
      (snapshot) => {
        const list: GiftRecord[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as GiftRecord);
        });
        setGiftRecords(list);
      },
      (err) => console.warn('Gifts listener error:', err)
    );
    return () => unsub();
  }, []);

  // 8. Subscribe to Firestore suppliers
  useEffect(() => {
    const suppliersCol = collection(db, 'suppliers');
    const unsub = onSnapshot(
      suppliersCol,
      (snapshot) => {
        const list: Supplier[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Supplier);
        });
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setSuppliers(list);
      },
      (err) => console.warn('Suppliers listener error:', err)
    );
    return () => unsub();
  }, []);

  // 9. Subscribe to Firestore categories
  useEffect(() => {
    const categoriesCol = collection(db, 'categories');
    const unsub = onSnapshot(
      categoriesCol,
      async (snapshot) => {
        if (snapshot.empty) {
          try {
            for (const cat of INITIAL_CATEGORIES) {
              await addDoc(categoriesCol, {
                ...cat,
                createdAt: new Date().toISOString(),
              });
            }
          } catch (err) {
            console.warn('Failed to seed categories:', err);
          }
          return;
        }

        const list: Category[] = [];
        const orderCounts: Record<number, number> = {};

        snapshot.forEach((d) => {
          const cat = { id: d.id, ...d.data() } as Category;
          list.push(cat);
          const ord = Number(cat.order);
          if (ord) {
            orderCounts[ord] = (orderCounts[ord] || 0) + 1;
          }
        });

        // Detect if any duplicate order numbers exist (e.g. order 12 used multiple times)
        // or if known categories have mismatching order numbers
        const hasDuplicateOrders = Object.values(orderCounts).some((c) => c > 1);
        if (hasDuplicateOrders) {
          // Auto-heal duplicate category orders to match standard unique sequence
          list.forEach((cat) => {
            const standardOrder = STANDARD_CATEGORY_ORDER[cat.name];
            if (standardOrder && cat.id && cat.order !== standardOrder) {
              // Update in Firestore
              updateDoc(doc(db, 'categories', cat.id), { order: standardOrder }).catch((e) =>
                console.warn(`Failed to auto-heal order for category ${cat.name}:`, e)
              );
              cat.order = standardOrder;
            }
          });
        }

        // Sort ascending by unique order sequence
        list.sort((a, b) => {
          const ordA = Number(a.order ?? 999);
          const ordB = Number(b.order ?? 999);
          if (ordA !== ordB) return ordA - ordB;
          return a.name.localeCompare(b.name, 'bn');
        });

        setCategories(list);
      },
      (err) => console.warn('Categories listener error:', err)
    );
    return () => unsub();
  }, []);

  // 10. Subscribe to Firestore offers
  useEffect(() => {
    const colRef = collection(db, 'offers');
    const unsub = onSnapshot(
      colRef,
      (snapshot) => {
        const list: Offer[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Offer));
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setOffers(list);
      },
      (err) => console.warn('Offers listener error:', err)
    );
    return () => unsub();
  }, []);

  // 11. Subscribe to Firestore packages
  useEffect(() => {
    const colRef = collection(db, 'packages');
    const unsub = onSnapshot(
      colRef,
      (snapshot) => {
        const list: ComboPackage[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as ComboPackage));
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setPackages(list);
      },
      (err) => console.warn('Packages listener error:', err)
    );
    return () => unsub();
  }, []);

  // 12. Subscribe to Firestore prebookings
  useEffect(() => {
    const colRef = collection(db, 'prebookings');
    const unsub = onSnapshot(
      colRef,
      (snapshot) => {
        const list: PreBookingCampaign[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as PreBookingCampaign));
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setPreBookingCampaigns(list);
      },
      (err) => console.warn('Prebookings listener error:', err)
    );
    return () => unsub();
  }, []);

  // 13. Subscribe to Firestore prebooking_orders
  useEffect(() => {
    const colRef = collection(db, 'prebooking_orders');
    const unsub = onSnapshot(
      colRef,
      (snapshot) => {
        const list: PreBookingOrder[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as PreBookingOrder));
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setPreBookingOrders(list);
      },
      (err) => console.warn('Prebooking orders listener error:', err)
    );
    return () => unsub();
  }, []);

  // 14. Subscribe to Firestore dailyDeals
  useEffect(() => {
    const colRef = collection(db, 'dailyDeals');
    const unsub = onSnapshot(
      colRef,
      (snapshot) => {
        const list: DailyDeal[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as DailyDeal));
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setDailyDeals(list);
      },
      (err) => console.warn('Daily deals listener error:', err)
    );
    return () => unsub();
  }, []);

  // 15. Subscribe to Firestore specialOffers
  useEffect(() => {
    const colRef = collection(db, 'specialOffers');
    const unsub = onSnapshot(
      colRef,
      (snapshot) => {
        const list: SpecialOffer[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as SpecialOffer));
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        setSpecialOffers(list);
      },
      (err) => console.warn('Special offers listener error:', err)
    );
    return () => unsub();
  }, []);

  // 16. Subscribe to Firestore reviews
  useEffect(() => {
    const colRef = collection(db, 'reviews');
    const unsub = onSnapshot(
      colRef,
      (snapshot) => {
        const list: ProductReview[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as ProductReview));
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setReviews(list);
      },
      (err) => console.warn('Reviews listener error:', err)
    );
    return () => unsub();
  }, []);

  // Seed Products Function
  const seedProducts = useCallback(async (overwrite = false) => {
    try {
      const productsCol = collection(db, 'products');
      if (overwrite) {
        const existing = await getDocs(productsCol);
        for (const docItem of existing.docs) {
          await deleteDoc(docItem.ref);
        }
      }
      for (const prod of INITIAL_PRODUCTS) {
        await addDoc(productsCol, prod);
      }
    } catch (err) {
      console.warn('Failed to seed products:', err);
    }
  }, []);

  // ================= PRODUCTS HANDLERS =================
  const handleAddProduct = async (product: Omit<Product, 'id'>) => {
    await addDoc(collection(db, 'products'), product);
  };

  const handleUpdateProduct = async (id: string, product: Partial<Product>) => {
    await updateDoc(doc(db, 'products', id), product);
  };

  const handleDeleteProduct = async (id: string, imageUrl?: string) => {
    await deleteDoc(doc(db, 'products', id));
    if (imageUrl) {
      await deleteProductImageFromStorage(imageUrl);
    }
  };

  // ================= ORDER & SALES HANDLERS =================
  const handleAddOrder = async (orderData: Omit<Order, 'id'>) => {
    // 1. Add order to Firestore
    const orderRef = await addDoc(collection(db, 'orders'), orderData);

    // 2. Auto-sync customer database
    const rawPhone = orderData.customerPhone || orderData.phone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
    const orderTotal = Number(orderData.totalPrice ?? orderData.total ?? 0);
    const orderProduct = orderData.productName || orderData.product || '';
    const orderDate = orderData.date || new Date().toISOString().split('T')[0];
    const orderAddress = orderData.customerAddress || orderData.address || '';

    if (cleanPhone) {
      const isExpat =
        orderData.orderType === 'expat' ||
        (orderData.customerCountry && orderData.customerCountry !== 'বাংলাদেশ (Bangladesh)') ||
        !!orderData.isGiftOrder;
      const countryName = orderData.customerCountry || (isExpat ? 'প্রবাসী' : 'বাংলাদেশ (Bangladesh)');

      const existingCustomer = customers.find(
        (c) => c.phone.replace(/[^0-9]/g, '') === cleanPhone
      );

      if (existingCustomer && existingCustomer.id) {
        await updateDoc(doc(db, 'customers', existingCustomer.id), {
          totalOrders: Number(existingCustomer.totalOrders || 0) + 1,
          totalPurchase: Number(existingCustomer.totalPurchase || 0) + orderTotal,
          lastOrder: orderDate,
          address: orderAddress || existingCustomer.address,
          customerType: isExpat ? 'expat' : existingCustomer.customerType || 'local',
          country: orderData.customerCountry || existingCustomer.country || 'বাংলাদেশ (Bangladesh)',
        });
      } else {
        await addDoc(collection(db, 'customers'), {
          name: orderData.customerName,
          phone: rawPhone,
          address: orderAddress,
          firstOrder: orderDate,
          lastOrder: orderDate,
          totalOrders: 1,
          totalPurchase: orderTotal,
          giftStatus: 'Not Sent',
          customerType: isExpat ? 'expat' : 'local',
          country: countryName,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 3. If order is confirmed / delivered, auto-record income transaction
    const isDelivered = orderData.status === 'Delivered' || orderData.status === 'delivered';
    if (isDelivered) {
      await addDoc(collection(db, 'transactions'), {
        date: orderDate,
        type: 'income',
        category: 'Sale',
        description: `বিক্রয়: ${orderProduct} (${orderData.customerName})`,
        amount: orderTotal,
        paymentMethod: orderData.paymentMethod || 'Cash',
        notes: `অর্ডার আইডি: ${orderRef.id}`,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleUpdateOrder = async (id: string, orderData: Partial<Order>) => {
    await updateDoc(doc(db, 'orders', id), orderData);

    // If order was marked as Delivered, check if income was recorded; if not, add transaction
    const isNowDelivered = orderData.status === 'Delivered' || orderData.status === 'delivered';
    if (isNowDelivered) {
      const existing = orders.find((o) => o.id === id);
      const wasDelivered = existing && (existing.status === 'Delivered' || existing.status === 'delivered');
      if (existing && !wasDelivered) {
        const orderTotal = Number(orderData.totalPrice ?? orderData.total ?? existing.totalPrice ?? existing.total ?? 0);
        const orderProduct = orderData.productName ?? orderData.product ?? existing.productName ?? existing.product ?? '';
        const orderDate = orderData.date ?? existing.date ?? new Date().toISOString().split('T')[0];

        await addDoc(collection(db, 'transactions'), {
          date: orderDate,
          type: 'income',
          category: 'Sale',
          description: `অর্ডার ডেলিভারি: ${orderProduct} (${orderData.customerName || existing.customerName})`,
          amount: orderTotal,
          paymentMethod: orderData.paymentMethod || existing.paymentMethod || 'Cash',
          notes: `অর্ডার আইডি: ${id}`,
          createdAt: new Date().toISOString(),
        });
      }
    }
  };

  const handleDeleteOrder = async (id: string) => {
    await deleteDoc(doc(db, 'orders', id));
  };

  // ================= PURCHASE HANDLERS =================
  const handleAddPurchase = async (purchase: Omit<Purchase, 'id'>) => {
    await addDoc(collection(db, 'purchases'), purchase);

    // 1. Auto-record expense if paid > 0
    if (purchase.paid > 0) {
      await addDoc(collection(db, 'transactions'), {
        date: purchase.date,
        type: 'expense',
        category: 'Purchase',
        description: `পণ্য ক্রয়: ${purchase.product} (${purchase.supplier})`,
        amount: Number(purchase.paid),
        paymentMethod: 'Cash',
        notes: `মোট: ৳${purchase.total}, বকেয়া: ৳${purchase.due}`,
        createdAt: new Date().toISOString(),
      });
    }

    // 2. Auto-sync or save supplier info in "suppliers" collection
    const cleanSupplierName = purchase.supplier.trim();
    if (cleanSupplierName) {
      const existingSupplier = suppliers.find(
        (s) => s.name.trim().toLowerCase() === cleanSupplierName.toLowerCase()
      );
      if (existingSupplier && existingSupplier.id) {
        await updateDoc(doc(db, 'suppliers', existingSupplier.id), {
          totalPurchases: Number(existingSupplier.totalPurchases || 0) + 1,
          totalAmount: Number(existingSupplier.totalAmount || 0) + Number(purchase.total || 0),
          phone: purchase.supplierPhone || existingSupplier.phone || '',
          address: purchase.supplierAddress || existingSupplier.address || '',
          email: purchase.supplierEmail || existingSupplier.email || '',
        });
      } else {
        await addDoc(collection(db, 'suppliers'), {
          name: cleanSupplierName,
          phone: purchase.supplierPhone || '',
          address: purchase.supplierAddress || '',
          email: purchase.supplierEmail || '',
          totalPurchases: 1,
          totalAmount: Number(purchase.total || 0),
          createdAt: new Date().toISOString(),
        });
      }
    }
  };

  const handleUpdatePurchase = async (id: string, purchase: Partial<Purchase>) => {
    await updateDoc(doc(db, 'purchases', id), purchase);
  };

  const handleDeletePurchase = async (id: string) => {
    await deleteDoc(doc(db, 'purchases', id));
  };

  // ================= SUPPLIER HANDLERS =================
  const handleAddSupplier = async (supplier: Omit<Supplier, 'id'>) => {
    await addDoc(collection(db, 'suppliers'), supplier);
  };

  const handleUpdateSupplier = async (id: string, supplier: Partial<Supplier>) => {
    await updateDoc(doc(db, 'suppliers', id), supplier);
  };

  const handleDeleteSupplier = async (id: string) => {
    await deleteDoc(doc(db, 'suppliers', id));
  };

  // ================= CATEGORY HANDLERS =================
  const handleAddCategory = async (category: Omit<Category, 'id'>) => {
    await addDoc(collection(db, 'categories'), category);
  };

  const handleUpdateCategory = async (id: string, category: Partial<Category>) => {
    await updateDoc(doc(db, 'categories', id), category);
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteDoc(doc(db, 'categories', id));
  };

  // ================= TRANSACTION HANDLERS =================
  const handleAddTransaction = async (tx: Omit<Transaction, 'id'>) => {
    await addDoc(collection(db, 'transactions'), tx);
  };

  const handleUpdateTransaction = async (id: string, tx: Partial<Transaction>) => {
    await updateDoc(doc(db, 'transactions', id), tx);
  };

  const handleDeleteTransaction = async (id: string) => {
    await deleteDoc(doc(db, 'transactions', id));
  };

  // ================= CUSTOMER HANDLERS =================
  const handleAddCustomer = async (cust: Omit<Customer, 'id'>) => {
    await addDoc(collection(db, 'customers'), cust);
  };

  const handleUpdateCustomer = async (id: string, cust: Partial<Customer>) => {
    await updateDoc(doc(db, 'customers', id), cust);
  };

  const handleDeleteCustomer = async (id: string) => {
    await deleteDoc(doc(db, 'customers', id));
  };

  // ================= GIFT HANDLERS =================
  const handleRecordGift = async (gift: Omit<GiftRecord, 'id'>) => {
    await addDoc(collection(db, 'gifts'), gift);
  };

  const handleUpdateCustomerGiftStatus = async (
    customerId: string,
    status: 'Sent' | 'Not Sent'
  ) => {
    await updateDoc(doc(db, 'customers', customerId), { giftStatus: status });
  };

  // ================= SETTINGS HANDLER =================
  const handleUpdateSettings = async (newSettings: Partial<StoreSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await setDoc(doc(db, 'settings', 'contact'), updated, { merge: true });
    if (newSettings.password) {
      await setDoc(
        doc(db, 'settings', 'admin'),
        { password: newSettings.password, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    }
  };

  // ================= OFFERS HANDLERS =================
  const handleAddOffer = async (offer: Omit<Offer, 'id'>) => {
    await addDoc(collection(db, 'offers'), offer);
  };
  const handleUpdateOffer = async (id: string, offer: Partial<Offer>) => {
    await updateDoc(doc(db, 'offers', id), offer);
  };
  const handleDeleteOffer = async (id: string) => {
    await deleteDoc(doc(db, 'offers', id));
  };

  // ================= PACKAGES HANDLERS =================
  const handleAddPackage = async (pkg: Omit<ComboPackage, 'id'>) => {
    await addDoc(collection(db, 'packages'), pkg);
  };
  const handleUpdatePackage = async (id: string, pkg: Partial<ComboPackage>) => {
    await updateDoc(doc(db, 'packages', id), pkg);
  };
  const handleDeletePackage = async (id: string) => {
    await deleteDoc(doc(db, 'packages', id));
  };

  // ================= PRE-BOOKING HANDLERS =================
  const handleAddPreBookingCampaign = async (campaign: Omit<PreBookingCampaign, 'id'>) => {
    await addDoc(collection(db, 'prebookings'), campaign);
  };
  const handleUpdatePreBookingCampaign = async (
    id: string,
    campaign: Partial<PreBookingCampaign>
  ) => {
    await updateDoc(doc(db, 'prebookings', id), campaign);
  };
  const handleDeletePreBookingCampaign = async (id: string) => {
    await deleteDoc(doc(db, 'prebookings', id));
  };
  const handleUpdatePreBookingOrderStatus = async (
    orderId: string,
    status: 'Confirmed' | 'Pending' | 'Cancelled'
  ) => {
    await updateDoc(doc(db, 'prebooking_orders', orderId), { status });
  };
  const handleCreatePreBookingOrder = async (order: Omit<PreBookingOrder, 'id'>) => {
    await addDoc(collection(db, 'prebooking_orders'), order);
    if (order.campaignId) {
      const camp = preBookingCampaigns.find((c) => c.id === order.campaignId);
      if (camp && camp.id) {
        await updateDoc(doc(db, 'prebookings', camp.id), {
          bookedSlots: (camp.bookedSlots || 0) + (order.quantity || 1),
        });
      }
    }
  };

  // ================= DAILY DEALS HANDLERS =================
  const handleAddDailyDeal = async (deal: Omit<DailyDeal, 'id'>) => {
    await addDoc(collection(db, 'dailyDeals'), deal);
  };
  const handleUpdateDailyDeal = async (id: string, deal: Partial<DailyDeal>) => {
    await updateDoc(doc(db, 'dailyDeals', id), deal);
  };
  const handleDeleteDailyDeal = async (id: string) => {
    await deleteDoc(doc(db, 'dailyDeals', id));
  };

  // ================= SPECIAL OFFERS HANDLERS =================
  const handleAddSpecialOffer = async (offer: Omit<SpecialOffer, 'id'>) => {
    await addDoc(collection(db, 'specialOffers'), offer);
  };
  const handleUpdateSpecialOffer = async (id: string, offer: Partial<SpecialOffer>) => {
    await updateDoc(doc(db, 'specialOffers', id), offer);
  };
  const handleDeleteSpecialOffer = async (id: string) => {
    await deleteDoc(doc(db, 'specialOffers', id));
  };

  // ================= REVIEWS HANDLERS =================
  const handleAddReview = async (reviewData: Omit<ProductReview, 'id'>) => {
    const sanitized: Record<string, any> = {};
    Object.entries(reviewData).forEach(([k, v]) => {
      if (v !== undefined) sanitized[k] = v;
    });
    await addDoc(collection(db, 'reviews'), sanitized);
  };
  const handleUpdateReview = async (id: string, reviewData: Partial<ProductReview>) => {
    await updateDoc(doc(db, 'reviews', id), reviewData);
  };
  const handleDeleteReview = async (id: string) => {
    await deleteDoc(doc(db, 'reviews', id));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 w-full max-w-full overflow-x-hidden">
      {/* Header (Mobile-first with Hamburger drawer, compact 56px height, responsive) */}
      <Header
        currentView={currentView}
        onViewChange={handleViewChange}
        settings={settings}
        onSelectCategory={(cat) => setStoreCategory(cat)}
        unreadCount={orders.filter((o) => !o.isRead).length}
      />

      {/* Main View: Store or Admin */}
      <div className="flex-1">
        {currentView === 'store' ? (
          <CustomerStore
            products={products}
            categories={categories}
            specialOffers={specialOffers}
            offers={offers}
            packages={packages}
            preBookingCampaigns={preBookingCampaigns}
            dailyDeals={dailyDeals}
            reviews={reviews}
            settings={settings}
            loading={loading}
            onCreateOrder={handleAddOrder}
            onCreatePreBookingOrder={handleCreatePreBookingOrder}
            onAddReview={handleAddReview}
            selectedCategory={storeCategory}
            onSelectCategory={(cat) => setStoreCategory(cat)}
          />
        ) : (
          <AdminPanel
            products={products}
            categories={categories}
            specialOffers={specialOffers}
            offers={offers}
            packages={packages}
            preBookingCampaigns={preBookingCampaigns}
            preBookingOrders={preBookingOrders}
            dailyDeals={dailyDeals}
            orders={orders}
            purchases={purchases}
            suppliers={suppliers}
            transactions={transactions}
            customers={customers}
            giftRecords={giftRecords}
            reviews={reviews}
            settings={settings}
            onBackToStore={() => handleViewChange('store')}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onAddSpecialOffer={handleAddSpecialOffer}
            onUpdateSpecialOffer={handleUpdateSpecialOffer}
            onDeleteSpecialOffer={handleDeleteSpecialOffer}
            onAddOffer={handleAddOffer}
            onUpdateOffer={handleUpdateOffer}
            onDeleteOffer={handleDeleteOffer}
            onAddPackage={handleAddPackage}
            onUpdatePackage={handleUpdatePackage}
            onDeletePackage={handleDeletePackage}
            onAddPreBookingCampaign={handleAddPreBookingCampaign}
            onUpdatePreBookingCampaign={handleUpdatePreBookingCampaign}
            onDeletePreBookingCampaign={handleDeletePreBookingCampaign}
            onUpdatePreBookingOrderStatus={handleUpdatePreBookingOrderStatus}
            onAddDailyDeal={handleAddDailyDeal}
            onUpdateDailyDeal={handleUpdateDailyDeal}
            onDeleteDailyDeal={handleDeleteDailyDeal}
            onSeedInitialProducts={() => seedProducts(false)}
            onAddOrder={handleAddOrder}
            onUpdateOrder={handleUpdateOrder}
            onDeleteOrder={handleDeleteOrder}
            onAddPurchase={handleAddPurchase}
            onUpdatePurchase={handleUpdatePurchase}
            onDeletePurchase={handleDeletePurchase}
            onAddSupplier={handleAddSupplier}
            onUpdateSupplier={handleUpdateSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            onAddTransaction={handleAddTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onRecordGift={handleRecordGift}
            onUpdateCustomerGiftStatus={handleUpdateCustomerGiftStatus}
            onUpdateReview={handleUpdateReview}
            onDeleteReview={handleDeleteReview}
            onUpdateSettings={handleUpdateSettings}
          />
        )}
      </div>

      {/* Footer (shown on customer store or admin) */}
      <Footer
        settings={settings}
        onAdminClick={() => handleViewChange('admin')}
      />
    </div>
  );
}

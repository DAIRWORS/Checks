const { createApp, ref, computed } = Vue;

createApp({
    setup() {
        // Состояние аутентификации
        const authenticated = ref(false);
        const password = ref('');
        const authError = ref('');
        const correctPassword = 'admin123';
        const showReceiptPreview = ref(false);

        // Данные компании
        const company = ref({
            name: 'ООО «Орион»',
            inn: '7724345967',
            address: 'г. Москва, ул. Бирюлевская, д. 34',
            taxSystem: 'ОСН',
            sellerName: 'Иванов И.И.'
        });

        // Данные чека
        const receipt = ref({
            number: '118',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            clientPhone: '',
            paymentType: 'наличными',
            products: [
                {
                    name: 'Стойка под дезинфектор (381 × 401 × 1525 мм)',
                    unit: 'шт.',
                    quantity: 1,
                    price: 6152.00,
                    vatRate: '20%'
                }
            ],
            total: 7690.00,
            vatAmount: 1538.00
        });

        // Форматирование даты
        const formattedDate = computed(() => {
            const [year, month, day] = receipt.value.date.split('-');
            const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 
                           'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
            return `«${day}» ${months[parseInt(month)-1]} ${year} г.`;
        });


                // Функция для получения текущей даты в формате YYYYMMDD
        const getCurrentDateString = () => {
            const now = new Date();
            return now.toISOString().slice(0, 10).replace(/-/g, '');
        };

        // Функция для получения следующего номера чека
        const getNextReceiptNumber = () => {
            const today = getCurrentDateString();
            const lastReceipt = receiptHistory.value[0];
            
            // Если есть сохраненные чеки и последний чек был сегодня
            if (lastReceipt && lastReceipt.date === today) {
                const lastNumber = parseInt(lastReceipt.number);
                return String(lastNumber + 1).padStart(3, '0');
            }
            
            // Если нет чеков или новый день - начинаем с 001
            return '001';
        };

        // Обновление номера чека при создании
        const updateReceiptNumber = () => {
            receipt.value.number = getNextReceiptNumber();
            receipt.value.date = getCurrentDateString(); // Добавляем текущую дату к чеку
        };

        // В методе saveReceipt
        const saveReceipt = () => {
            updateReceiptNumber(); // Обновляем номер перед сохранением
            const receiptCopy = JSON.parse(JSON.stringify(receipt.value));
            receiptHistory.value.unshift(receiptCopy);
            localStorage.setItem('receiptHistory', JSON.stringify(receiptHistory.value));
            alert('Чек сохранен в истории!');
            
            // Генерируем новый номер для следующего чека
            receipt.value.number = getNextReceiptNumber();
        };

        // В методе deleteAllReceipts
        const deleteAllReceipts = () => {
            if (confirm('Вы уверены, что хотите удалить ВСЕ чеки?')) {
                receiptHistory.value = [];
                localStorage.removeItem('receiptHistory');
                receipt.value.number = '001'; // Сбрасываем номер
                receipt.value.date = getCurrentDateString(); // Обновляем дату
            }
        };

        // Методы аутентификации
        const login = () => {
            if (!password.value.trim()) {
                authError.value = 'Введите пароль';
                return;
            }

            if (password.value === correctPassword) {
                authenticated.value = true;
                authError.value = '';
                localStorage.setItem('isAuthenticated', 'true');
                loadSavedData();
            } else {
                authError.value = 'Неверный пароль';
                password.value = '';
            }
        };

        const logout = () => {
            authenticated.value = false;
            password.value = '';
            localStorage.removeItem('isAuthenticated');
        };

                // В методе checkAuth добавьте:
        const checkAuth = () => {
            if (localStorage.getItem('isAuthenticated') === 'true') {
                authenticated.value = true;
                loadSavedData();
                updateReceiptNumber(); // Устанавливаем актуальный номер при загрузке
            }
        };

        // Методы работы с данными
        const saveCompanySettings = () => {
            localStorage.setItem('receiptCompany', JSON.stringify(company.value));
            alert('Настройки компании сохранены!');
        };

        const loadSavedData = () => {
            const savedCompany = localStorage.getItem('receiptCompany');
            if (savedCompany) {
                company.value = JSON.parse(savedCompany);
            }
        };


        // Методы для работы с товарами
        const addProduct = () => {
            receipt.value.products.push({
                name: '',
                unit: 'шт.',
                quantity: 1,
                price: 0,
                vatRate: '20%'
            });
        };

        const removeProduct = (index) => {
            receipt.value.products.splice(index, 1);
            calculateTotal();
        };

        const calculateTotal = () => {
            let totalWithoutVat = 0;
            let vatAmount = 0;
            
            receipt.value.products.forEach(product => {
                const price = parseFloat(product.price) || 0;
                const quantity = parseInt(product.quantity) || 0;
                const vatRate = parseInt(product.vatRate) || 0;
                
                const productTotal = price * quantity;
                totalWithoutVat += productTotal;
                vatAmount += productTotal * (vatRate / 100);
            });
            
            receipt.value.total = totalWithoutVat + vatAmount;
            receipt.value.vatAmount = vatAmount;
        };

        const generateReceipt = () => {
            calculateTotal();
            showReceiptPreview.value = true;
        };

        // Функция для скачивания PDF
        const downloadPDF = () => {
            try {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                // Устанавливаем стандартный шрифт с поддержкой кириллицы
                doc.setFont("courier");
                doc.setFontSize(12);
                
                // Шапка чека
                doc.text(`${company.value.name}, ИНН ${company.value.inn}`, 15, 15);
                doc.text(company.value.address, 15, 20);
                doc.text(`Товарный чек № ${receipt.value.number} от ${formattedDate.value}`, 15, 30);
                
                // Таблица товаров
                const headers = [
                    '№',
                    'Наименование',
                    'Ед.',
                    'Кол-во',
                    'Цена',
                    'НДС',
                    'Сумма'
                ];
                
                const productsData = receipt.value.products.map((product, index) => [
                    index + 1,
                    product.name,
                    product.unit,
                    product.quantity,
                    `${product.price.toFixed(2)} ₽`,
                    product.vatRate,
                    `${(product.price * product.quantity * (1 + parseInt(product.vatRate)/100)).toFixed(2)} ₽`
                ]);
                
                // Итоговая строка
                productsData.push([
                    '',
                    'ИТОГО',
                    '',
                    '',
                    '',
                    '',
                    `${receipt.value.total.toFixed(2)} ₽`
                ]);
                
                // Генерация таблицы
                doc.autoTable({
                    startY: 40,
                    head: [headers],
                    body: productsData,
                    styles: { 
                        font: "courier",
                        fontSize: 10,
                        cellPadding: 3,
                        valign: 'middle'
                    },
                    headStyles: {
                        fillColor: [220, 220, 220],
                        textColor: [0, 0, 0],
                        fontStyle: 'bold'
                    },
                    columnStyles: {
                        0: { cellWidth: 10 },
                        1: { cellWidth: 60 },
                        2: { cellWidth: 10 },
                        3: { cellWidth: 15 },
                        4: { cellWidth: 20 },
                        5: { cellWidth: 15 },
                        6: { cellWidth: 20 }
                    }
                });
                
                // Подвал чека
                const finalY = doc.autoTable.previous.finalY + 10;
                doc.text(`Продавец: ${company.value.sellerName}`, 15, finalY);
                doc.text(`Телефон клиента: ${receipt.value.clientPhone}`, 15, finalY + 10);
                
                // Сохранение PDF
                doc.save(`Чек_${receipt.value.number}.pdf`);
                showReceiptPreview.value = false;
            } catch (error) {
                console.error('Ошибка при создании PDF:', error);
                alert('Ошибка при создании PDF. Проверьте консоль для подробностей.');
            }
        };

        // Проверяем авторизацию при загрузке
        checkAuth();

        return {
            authenticated,
            password,
            authError,
            company,
            receipt,
            showReceiptPreview,
            formattedDate,
            login,
            logout,
            saveCompanySettings,
            addProduct,
            removeProduct,
            calculateTotal,
            generateReceipt,
            downloadPDF
        };
    }
}).mount('#app');
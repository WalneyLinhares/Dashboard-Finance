class Transaction {
    #amount;

    constructor(data) {
        this.id = data.id;
        this.description = data.description;
        this.date = data.date;
        this.category = data.category;
        this.amount = data.amount;
    }

    get amount() {
        return this.#amount;
    }

    set amount(value) {
        if (value <= 0) throw new Error("O valor deve ser maior que zero");
        this.#amount = value;
    }

    toJSON() {
        return {
            id: this.id,
            description: this.description,
            amount: this.amount,
            category: this.category,
            date: this.date,
            type: this.type
        };
    }
}

class Income extends Transaction {
    get type() {
        return 'income';
    }
}

class Expense extends Transaction {
    get type() {
        return 'expense';
    }
}

class FinanceManager {
    #transactions = []

    constructor() {
        this.#loadFromLocalStorage();
    }

    addTransaction(transaction) {
        this.#transactions.push(transaction);
        this.#saveToLocalStorage();
    }

    removeTransaction(id) {
        this.#transactions = this.#transactions.filter(transaction => transaction.id !== id);
        this.#saveToLocalStorage();
    }

    #saveToLocalStorage() {
        localStorage.setItem('@financeApp:transactions', JSON.stringify(this.#transactions)); // Chama toSON de cada Array
    }

    #loadFromLocalStorage() {
        const savedData = localStorage.getItem('@financeApp:transactions');

        if (!savedData) return;

        const rawTransactions = JSON.parse(savedData);

        this.#transactions = rawTransactions.map(data => {
            if (data.type === 'income') {
                return new Income(data);
            } else if (data.type === 'expense') {
                return new Expense(data);
            }
        }).filter(Boolean);
    }

    getTransactions() {
        return this.#transactions;
    }

    get totalIncomes() {
        return this.#transactions.reduce((acc, transaction) => {
            if (transaction.type === 'income') {
                return acc + transaction.amount;
            }
            return acc;
        }, 0);
    }

    get totalExpenses() {
        return this.#transactions.reduce((acc, transaction) => {
            if (transaction.type === 'expense') {
                return acc + transaction.amount;
            }
            return acc;
        }, 0);
    }

    get balance() {
        return this.totalIncomes - this.totalExpenses;
    }
}

class FinancePanel {
    constructor(financeManager) {
        this.financeManager = financeManager;
        this.form = document.querySelector('#transaction-form');
        this.inputDescription = document.querySelector('#description');
        this.inputAmount = document.querySelector('#amount');
        this.inputCategory = document.querySelector('#category');
        this.selectType = document.querySelector('#type');
        this.displayIncomes = document.querySelector('#incomes-display');
        this.displayExpenses = document.querySelector('#expenses-display');
        this.displayBalance = document.querySelector('#balance-display');
        this.transactionsList = document.querySelector('#transaction-list');
        this.selectFilter = document.querySelector('#filter-type');
        this.searchInput = document.querySelector('#search-input');
    }

    init() {
        this.form.addEventListener('submit', (event) => this.formToSend(event));
        this.transactionsList.addEventListener('click', (event) => this.clickEvents(event));
        this.selectFilter.addEventListener('change', () => this.render());
        this.searchInput.addEventListener('input', () => this.render());
        this.inputAmount.addEventListener('input', (event) => this.mask(event));
        this.render();
    }

    mask(event) {
        let valor = event.target.value.replace(/\D/g, "");

        valor = (Number(valor) / 100).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        event.target.value = valor;
    }

    clickEvents(event) {
        const el = event.target;
        if (el.classList.contains('remove')) {
            const id = el.dataset.id;
            this.financeManager.removeTransaction(id);
            this.render();
        }
    }

    formToSend(event) {
        event.preventDefault();

        const cleanAmount = this.inputAmount.value
            .replace(/\./g, '')
            .replace(',', '.');

        const formData = {
            id: crypto.randomUUID(),
            description: this.inputDescription.value,
            amount: Number(cleanAmount),
            category: this.inputCategory.value,
            date: new Date(),
        }

        let newTransaction;

        if (this.selectType.value === 'income') { newTransaction = new Income(formData) }

        if (this.selectType.value === 'expense') { newTransaction = new Expense(formData) }

        if (!newTransaction) return;

        this.financeManager.addTransaction(newTransaction);
        this.render();
        this.form.reset();
    }

    filters() {
        const filterName = this.selectFilter.value;
        const searchText = this.searchInput.value.toLowerCase().trim();

        let transactions = this.financeManager.getTransactions();

        if (searchText !== '') {
            transactions = transactions.filter(t =>
                t.description.toLowerCase().includes(searchText)
            );
        }

        if (filterName === 'income' || filterName === 'expense') {
            transactions = transactions.filter(t => t.type === this.selectFilter.value);
        } else if (filterName === 'bigger') {
            transactions = [...transactions].sort((a, b) => b.amount - a.amount);
        } else if (filterName === 'smaller') {
            transactions = [...transactions].sort((a, b) => a.amount - b.amount);
        } else if (filterName === 'date-recent') {
            transactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        } else if (filterName === 'date-old') {
            transactions = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
        }

        return transactions;
    }

    render() {
        const formatCurrency = (value) => {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(value);
        };

        this.displayIncomes.textContent = formatCurrency(this.financeManager.totalIncomes);
        this.displayExpenses.textContent = formatCurrency(this.financeManager.totalExpenses);
        this.displayBalance.textContent = formatCurrency(this.financeManager.balance);
        this.displayBalance.classList.toggle('negative', this.financeManager.balance < 0);

        this.transactionsList.innerHTML = '';

        let transactions = this.filters();

        transactions.forEach(transaction => {
            const dateFormatted = new Date(transaction.date).toLocaleDateString('pt-BR');
            const tr = document.createElement('tr');
            const transactionTypeEl = transaction.type === 'income'
                ? `<i class="fa-solid fa-up-long"></i>`
                : `<i class="fa-solid fa-down-long"></i>`;

            tr.innerHTML = `
            <td>${transaction.description}</td>
            <td>${transaction.category}</td>
            <td>${dateFormatted}</td>
            <td>${formatCurrency(transaction.amount)}</td> 
            <td style="text-align: center;">${transactionTypeEl}</td>
            <td><button class="remove" data-id="${transaction.id}">Excluir</button></td>
        `;

            this.transactionsList.appendChild(tr);
        });
    }
}

const financeManager = new FinanceManager();
const PanelFinance = new FinancePanel(financeManager);
PanelFinance.init();
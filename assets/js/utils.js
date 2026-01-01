function sanitizeInput(input) {
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

const rateLimit = {};
function checkRateLimit(key, limit = 5, windowMs = 60000) {
    const now = Date.now();
    if (!rateLimit[key]) rateLimit[key] = [];
    rateLimit[key] = rateLimit[key].filter(time => now - time < windowMs);
    if (rateLimit[key].length < limit) {
        rateLimit[key].push(now);
        return true;
    }
    return false;
}

function auditLog(action, details) {
    const log = {
        timestamp: new Date().toISOString(),
        userId: window.web3 ? window.web3.eth.accounts[0] : 'unknown',
        action,
        details
    };
    console.log('Audit Log:', log);
    localStorage.setItem('audit_' + Date.now(), JSON.stringify(log));
}

async function retryWithBackoff(fn, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
    }
}

function fixNumber(n) {
    return Math.round((n) * 1e12) / 1e12;
}

async function getBalance() {
    const address = web3.eth.getAccounts(function(err, acc) {
        accounts = acc;
    });
    const balance = web3.utils.fromWei(await web3.eth.getBalance(accounts[0]), 'ether');
    const fixbalance = Number(balance).toFixed(2);
    document.getElementById("mybalance").innerHTML = fixbalance;
}

// Exports for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { sanitizeInput, checkRateLimit, auditLog };
}
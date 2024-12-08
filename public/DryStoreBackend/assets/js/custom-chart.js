(function () {
    "use strict";
    
    async function fetchSalesData(filterType = 'yearly') {
        try {
            const url = new URL('/admin/dashboardData', window.location.origin);
            url.searchParams.append('filter', filterType);
    
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
    
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
    
            return await response.json();
        } catch (error) {
            console.error('Error fetching sales data:', error);
            throw error;
        }
    } 

    function prepareChartData(data) {
        const labels = data.sales.map(item => {
            if (item._id.quarter) {
                return `Q${item._id.quarter} ${item._id.year}`;
            }
            return `${item._id.month}/${item._id.year}`;
        });

        return {
            labels: labels,
            salesData: data.sales.map(item => item.totalSales),
            usersData: data.users.map(item => item.totalUsers),
            productsData: labels.map(() => data.products.totalProducts)
        };
    }

    function initCharts() {
        if (document.getElementById('myChart')) {
            var ctx = document.getElementById('myChart').getContext('2d');
            var chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: [
                        {
                            label: 'Sales',
                            tension: 0.3,
                            fill: true,
                            backgroundColor: 'rgba(44, 120, 220, 0.2)',
                            borderColor: 'rgba(44, 120, 220)',
                            data: []
                        },
                        {
                            label: 'Users',
                            tension: 0.3,
                            fill: true,
                            backgroundColor: 'rgba(4, 209, 130, 0.2)',
                            borderColor: 'rgb(4, 209, 130)',
                            data: []
                        },
                        {
                            label: 'Products',
                            tension: 0.3,
                            fill: true,
                            backgroundColor: 'rgba(380, 200, 230, 0.2)',
                            borderColor: 'rgb(380, 200, 230)',
                            data: []
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            labels: {
                                usePointStyle: true,
                            },
                        }
                    }
                }
            });

            // Initial data load
            fetchSalesData()
                .then(data => {
                    const chartData = prepareChartData(data);
                    chart.data.labels = chartData.labels;
                    chart.data.datasets[0].data = chartData.salesData;
                    chart.data.datasets[1].data = chartData.usersData;
                    chart.data.datasets[2].data = chartData.productsData;
                    chart.update();
                })
                .catch(error => {
                    console.error('Error initializing chart:', error);
                });

            // Filter change event
            document.getElementById('filter').addEventListener('change', function() {
                var filterType = this.value;
                fetchSalesData(filterType)
                    .then(data => {
                        const chartData = prepareChartData(data);
                        chart.data.labels = chartData.labels;
                        chart.data.datasets[0].data = chartData.salesData;
                        chart.data.datasets[1].data = chartData.usersData;
                        chart.data.datasets[2].data = chartData.productsData;
                        chart.update();
                    })
                    .catch(error => {
                        console.error('Error updating chart:', error);
                    });
            });
        }
    }

    // Use DOMContentLoaded instead of jQuery's document.ready
    document.addEventListener('DOMContentLoaded', initCharts);
})();
// pages/reports/index.js
import Layout from '../../components/Layout/Layout';
import { BarChart3, Download, TrendingUp, Package, Truck, Users } from 'lucide-react';

export default function Reports() {
    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
                    <p className="text-gray-600 mt-1">View insights and generate reports</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                        { title: 'Purchase Orders Report', icon: Package, color: 'from-blue-500 to-blue-600' },
                        { title: 'Shipments Report', icon: Truck, color: 'from-green-500 to-green-600' },
                        { title: 'Vendor Performance', icon: Users, color: 'from-purple-500 to-purple-600' },
                        { title: 'Financial Summary', icon: TrendingUp, color: 'from-yellow-500 to-yellow-600' },
                        { title: 'Returns Analysis', icon: BarChart3, color: 'from-red-500 to-red-600' },
                        { title: 'Inventory Status', icon: Package, color: 'from-indigo-500 to-indigo-600' },
                    ].map((report, index) => (
                        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer">
                            <div className={`w-12 h-12 bg-gradient-to-br ${report.color} rounded-lg flex items-center justify-center mb-4`}>
                                <report.icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{report.title}</h3>
                            <p className="text-sm text-gray-600 mb-4">Generate detailed {report.title.toLowerCase()}</p>
                            <button className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm">
                                <Download className="w-4 h-4" />
                                <span>Download Report</span>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
}

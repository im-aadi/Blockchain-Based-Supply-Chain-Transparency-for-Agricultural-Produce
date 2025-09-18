import React from 'react';
import { useQuery } from 'react-query';
import { 
  Package, 
  Truck, 
  Award, 
  TrendingUp, 
  Users, 
  MapPin,
  QrCode,
  BarChart3
} from 'lucide-react';
import { analyticsAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import ErrorMessage from '../../components/UI/ErrorMessage';
import StatsCard from '../../components/Dashboard/StatsCard';
import RecentProducts from '../../components/Dashboard/RecentProducts';
import StatusChart from '../../components/Dashboard/StatusChart';
import CategoryChart from '../../components/Dashboard/CategoryChart';

const Dashboard = () => {
  const { user } = useAuth();

  const { data: analytics, isLoading, error } = useQuery(
    'dashboard-analytics',
    () => analyticsAPI.getDashboard().then(res => res.data.data),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message="Failed to load dashboard data" />;
  }

  const stats = analytics?.overview || {};
  const statusDistribution = analytics?.statusDistribution || [];
  const categoryDistribution = analytics?.categoryDistribution || [];
  const recentProducts = analytics?.recentProducts || [];

  const quickActions = [
    {
      title: 'Add Product',
      description: 'Register a new agricultural product',
      icon: Package,
      href: '/products/add',
      color: 'bg-green-500',
      roles: ['farmer']
    },
    {
      title: 'Scan QR Code',
      description: 'Scan product QR code for traceability',
      icon: QrCode,
      href: '/qr/scanner',
      color: 'bg-blue-500',
      roles: ['all']
    },
    {
      title: 'Transfer Product',
      description: 'Transfer product in supply chain',
      icon: Truck,
      href: '/supply-chain',
      color: 'bg-purple-500',
      roles: ['distributor', 'retailer']
    },
    {
      title: 'Add Certification',
      description: 'Add certification to product',
      icon: Award,
      href: '/certifications/add',
      color: 'bg-yellow-500',
      roles: ['certifier']
    }
  ];

  const canAccess = (roles) => {
    if (roles.includes('all')) return true;
    return roles.includes(user?.role);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here's what's happening with your agricultural supply chain today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Products"
          value={stats.totalProducts || 0}
          icon={Package}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <StatsCard
          title="Verified Products"
          value={stats.verifiedProducts || 0}
          icon={Award}
          color="text-green-600"
          bgColor="bg-green-100"
        />
        <StatsCard
          title="Verification Rate"
          value={`${stats.verificationRate || 0}%`}
          icon={TrendingUp}
          color="text-purple-600"
          bgColor="bg-purple-100"
        />
        <StatsCard
          title="Inspected Products"
          value={stats.totalInspected || 0}
          icon={BarChart3}
          color="text-orange-600"
          bgColor="bg-orange-100"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusChart data={statusDistribution} />
        <CategoryChart data={categoryDistribution} />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            if (!canAccess(action.roles)) return null;
            
            return (
              <a
                key={action.title}
                href={action.href}
                className="group relative bg-white p-6 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center">
                  <div className={`${action.color} p-3 rounded-lg`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900 group-hover:text-indigo-600">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-500">{action.description}</p>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Recent Products */}
      <RecentProducts products={recentProducts} />

      {/* Supply Chain Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Supply Chain Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
              <Truck className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Active Transfers</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {analytics?.supplyChain?.avgSupplyChainLength?.toFixed(1) || 0}
            </p>
            <p className="text-sm text-gray-500">Average chain length</p>
          </div>
          
          <div className="text-center">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
              <MapPin className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Locations</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {statusDistribution.length}
            </p>
            <p className="text-sm text-gray-500">Active locations</p>
          </div>
          
          <div className="text-center">
            <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Stakeholders</h3>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {recentProducts.length}
            </p>
            <p className="text-sm text-gray-500">Recent activity</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

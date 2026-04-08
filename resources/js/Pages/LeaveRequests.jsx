import { Head, Link, router } from '@inertiajs/react'
import AppLayout from '../Layouts/AppLayout'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { TableRowSkeleton, CardSkeleton } from '../Components/SkeletonLoader'
import Pagination from '../Components/Pagination'
import HorizontalScrollTable from '../Components/HorizontalScrollTable'

export default function LeaveRequests({ auth }) {
    const [leaveRequests, setLeaveRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [activeTab, setActiveTab] = useState('all-requests')
    const [pagination, setPagination] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [perPage, setPerPage] = useState(10)
    const [selectedRequests, setSelectedRequests] = useState([])
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        fetchLeaveRequests()
    }, [statusFilter, activeTab, currentPage, perPage])

    // Clear selections when search term changes
    useEffect(() => {
        setSelectedRequests([])
    }, [searchTerm])

    const fetchLeaveRequests = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (statusFilter !== 'all') {
                params.append('status', statusFilter)
            }

            // Add tab parameter
            params.append('tab', activeTab)

            // Add pagination parameters
            params.append('page', currentPage)
            params.append('per_page', perPage)

            const response = await axios.get(`/api/leave-requests?${params.toString()}`)
            if (response.data.success) {
                setLeaveRequests(response.data.data || [])
                setPagination(response.data.pagination || null)
            }
        } catch (error) {
            console.error('Error fetching leave requests:', error)
        } finally {
            setLoading(false)
        }
    }


    // Filter on client side for search
    const filteredLeaveRequests = leaveRequests.filter(request => {
        if (!searchTerm) return true

        const employeeName = request.employee?.full_name || request.employee?.name || `User Deleted (ID: ${request.employee_id})`
        const matchesSearch = request.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            employeeName.toLowerCase().includes(searchTerm.toLowerCase())

        return matchesSearch
    })

    const canSubmitLeaveRequest = () => {
        const user = auth.user
        return user && (user.role?.name === 'admin' || user.role?.name === 'manager' || user.role?.name === 'employee' || user.role?.name === 'procurement')
    }

    const canViewAllRequests = () => {
        const user = auth.user
        return user && (user.role?.name === 'admin' || user.role?.name === 'manager' || user.role?.name === 'hr')
    }

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'pending': return 'bg-yellow-100 text-yellow-800'
            case 'pending approval': return 'bg-orange-100 text-orange-800'
            case 'approved': return 'bg-green-100 text-green-800'
            case 'rejected': return 'bg-red-100 text-red-800'
            case 'cancelled': return 'bg-gray-100 text-gray-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }


    const formatDateRange = (startDate, endDate) => {
        const start = new Date(startDate).toLocaleDateString()
        const end = new Date(endDate).toLocaleDateString()
        return `${start} - ${end}`
    }

    // Pagination handlers
    const handlePageChange = (page) => {
        setCurrentPage(page)
    }

    const handlePerPageChange = (newPerPage) => {
        setPerPage(newPerPage)
        setCurrentPage(1)
    }

    const handleStatusFilterChange = (status) => {
        setStatusFilter(status)
        setCurrentPage(1)
        setSelectedRequests([]) // Clear selections when changing filters
    }

    const handleTabChange = (tab) => {
        setActiveTab(tab)
        setCurrentPage(1)
        setSelectedRequests([]) // Clear selections when changing tabs
    }

    // Checkbox selection handlers
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const selectableRequests = filteredLeaveRequests.filter(request => {
                // Admin can select all requests
                if (auth.user.role?.name === 'admin') return true
                // Other users can only select their own requests
                return request.employee_id === auth.user.id
            })
            setSelectedRequests(selectableRequests.map(request => request.id))
        } else {
            setSelectedRequests([])
        }
    }

    const handleSelectRequest = (requestId, isChecked) => {
        if (isChecked) {
            setSelectedRequests(prev => [...prev, requestId])
        } else {
            setSelectedRequests(prev => prev.filter(id => id !== requestId))
        }
    }

    const canSelectRequest = (request) => {
        // Admin can select all requests
        if (auth.user.role?.name === 'admin') return true
        // Other users can only select their own requests
        return request.employee_id === auth.user.id
    }

    // Bulk delete functionality
    const handleBulkDelete = async () => {
        if (selectedRequests.length === 0) return

        try {
            setIsDeleting(true)

            const response = await axios.post('/api/leave-requests/bulk-delete', {
                request_ids: selectedRequests
            })

            if (response.data.success) {
                // Clear selections
                setSelectedRequests([])

                // Refresh the requests list
                fetchLeaveRequests()
            }
        } catch (error) {
            console.error('Error deleting leave requests:', error)
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <AppLayout title="Leave Requests" auth={auth}>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
                    <p className="text-gray-600 mt-1">Manage your leave requests and approvals.</p>
                </div>

                {/* Search, Filter and Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1 max-w-md">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search leave requests..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                            </div>
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => handleStatusFilterChange(e.target.value)}
                            className="block w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                            <option value="all">All Status</option>
                            <option value="Pending">Pending</option>
                            <option value="Pending Approval">Pending Approval</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        {/* Delete Button - Show when requests are selected */}
                        {selectedRequests.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                disabled={isDeleting}
                                className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-md font-medium text-center sm:text-left flex items-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Delete ({selectedRequests.length})
                                    </>
                                )}
                            </button>
                        )}
                        {canSubmitLeaveRequest() && (
                            <Link
                                href="/leave-requests/new"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-center sm:text-left"
                            >
                                New Leave Request
                            </Link>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                {canViewAllRequests() && (
                    <div className="tab-container">
                        <nav className="tab-nav">
                            <button
                                onClick={() => handleTabChange('all-requests')}
                                className={`tab-button ${
                                    activeTab === 'all-requests' ? 'active' : ''
                                }`}
                            >
                                All Leave Requests
                            </button>
                            <button
                                onClick={() => handleTabChange('my-requests')}
                                className={`tab-button ${
                                    activeTab === 'my-requests' ? 'active' : ''
                                }`}
                            >
                                My Leave Requests
                            </button>
                        </nav>
                    </div>
                )}

                {/* Leave Requests Table - Desktop */}
                <HorizontalScrollTable className="hidden lg:block bg-white shadow-sm rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <div className="custom-checkbox">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={selectedRequests.length > 0 && selectedRequests.length === filteredLeaveRequests.filter(canSelectRequest).length}
                                        />
                                        <span className="checkmark"></span>
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Employee
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Reason
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date Range
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Days
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Submitted
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <TableRowSkeleton columns={9} rows={8} />
                            ) : (
                                filteredLeaveRequests.map((request) => (
                                    <tr key={request.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {canSelectRequest(request) ? (
                                                <div className="custom-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRequests.includes(request.id)}
                                                        onChange={(e) => handleSelectRequest(request.id, e.target.checked)}
                                                    />
                                                    <span className="checkmark"></span>
                                                </div>
                                            ) : (
                                                <div className="h-5 w-5"></div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            #{request.id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {request.employee?.full_name || (
                                                <span className="text-red-600 italic">
                                                    User Deleted (ID: {request.employee_id})
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <div className="max-w-xs truncate" title={request.reason}>
                                                {request.reason}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDateRange(request.start_date, request.end_date)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {request.total_days} days
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                                {request.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(request.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <Link
                                                href={`/leave-requests/${request.id}`}
                                                className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md text-xs"
                                            >
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </HorizontalScrollTable>

                {/* Leave Requests Cards - Mobile */}
                <div className="lg:hidden space-y-4">
                    {loading ? (
                        <CardSkeleton count={5} />
                    ) : (
                        filteredLeaveRequests.map((request) => (
                            <div key={request.id} className="bg-white shadow-sm rounded-lg p-4 border border-gray-200">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-medium text-gray-900 truncate">
                                            {request.reason}
                                        </h3>
                                        <p className="text-xs text-gray-500">#{request.id}</p>
                                    </div>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                        {request.status}
                                    </span>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Employee:</span>
                                        <span className="text-gray-900">{request.employee?.full_name || `User Deleted (ID: ${request.employee_id})`}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Date Range:</span>
                                        <span className="text-gray-900">{formatDateRange(request.start_date, request.end_date)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Days:</span>
                                        <span className="text-gray-900 font-medium">{request.total_days} days</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Submitted:</span>
                                        <span className="text-gray-900">{new Date(request.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-gray-200">
                                    <Link
                                        href={`/leave-requests/${request.id}`}
                                        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-900 px-3 py-2 rounded-md text-xs font-medium text-center block"
                                    >
                                        View Details
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {!loading && filteredLeaveRequests.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-gray-400 text-6xl mb-4">🏖️</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No leave requests found</h3>
                        <p className="text-gray-500">
                            {searchTerm
                                ? 'Try adjusting your search criteria'
                                : 'Get started by creating your first leave request'
                            }
                        </p>
                    </div>
                )}

                {/* Pagination */}
                {!loading && pagination && (
                    <div className="mt-6">
                        <Pagination
                            pagination={pagination}
                            onPageChange={handlePageChange}
                            onPerPageChange={handlePerPageChange}
                            perPageOptions={[10, 25, 50]}
                            className="bg-white p-4 rounded-lg shadow-sm"
                        />
                    </div>
                )}
            </div>
        </AppLayout>
    )
}

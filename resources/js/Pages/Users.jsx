import { Head, Link } from '@inertiajs/react'
import AppLayout from '../Layouts/AppLayout'
import { useState, useEffect } from 'react'
import axios from 'axios'
import AlertModal from '../Components/AlertModal'
import { TableRowSkeleton, CardSkeleton } from '../Components/SkeletonLoader'
import Pagination from '../Components/Pagination'
import HorizontalScrollTable from '../Components/HorizontalScrollTable'

export default function Users({ auth }) {
    const [users, setUsers] = useState([])
    const [departments, setDepartments] = useState([])
    const [filteredDepartments, setFilteredDepartments] = useState([])
    const [departmentsLoading, setDepartmentsLoading] = useState(false)
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [departmentFilter, setDepartmentFilter] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        department_id: '',
        role_id: ''
    })
    const [errors, setErrors] = useState({})
    const [submitting, setSubmitting] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [userToDelete, setUserToDelete] = useState(null)
    const [showAlert, setShowAlert] = useState(false)
    const [alertMessage, setAlertMessage] = useState('')
    const [alertType, setAlertType] = useState('info')
    const [deleting, setDeleting] = useState(false)
    const [pagination, setPagination] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [perPage, setPerPage] = useState(10)


    // Fixed roles - no need to fetch from API
    const fixedRoles = [
        { id: 1, name: 'admin', description: 'Full system access' },
        { id: 2, name: 'manager', description: 'Department manager' },
        { id: 3, name: 'employee', description: 'Basic employee' },
        { id: 4, name: 'procurement', description: 'Procurement team member' }
    ]

    // Debounced effect for search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchUsers()
        }, searchTerm ? 500 : 0) // Only debounce search, not other filters

        return () => clearTimeout(timeoutId)
    }, [currentPage, perPage, roleFilter, departmentFilter, searchTerm])

    useEffect(() => {
        fetchDepartments()
    }, [])

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()

            // Add pagination parameters
            params.append('page', currentPage)
            params.append('per_page', perPage)

            // Add filter parameters
            if (roleFilter) {
                params.append('role_id', roleFilter)
            }
            if (departmentFilter) {
                params.append('department_id', departmentFilter)
            }
            if (searchTerm) {
                params.append('search', searchTerm)
            }

            const url = `/api/admin/users?${params.toString()}`
            console.log('Fetching users with URL:', url)
            console.log('Filter parameters:', { roleFilter, departmentFilter, searchTerm })

            const response = await axios.get(url)
            console.log('API Response:', response.data)

            if (response.data.success) {
                setUsers(response.data.data || [])
                setPagination(response.data.pagination || null)
            }
        } catch (error) {
            console.error('Error fetching users:', error)
            console.error('Error response:', error.response?.data)
        } finally {
            setLoading(false)
        }
    }

    const fetchDepartments = async () => {
        try {
            const response = await axios.get('/api/admin/departments')
            if (response.data.success) {
                setDepartments(response.data.data)
            }
        } catch (error) {
            console.error('Error fetching departments:', error)
        }
    }

    const fetchDepartmentsByRole = async (roleId) => {
        try {
            setDepartmentsLoading(true)
            console.log('Fetching departments for role:', roleId)
            const response = await axios.get(`/api/departments/by-role?role_id=${roleId}`)
            console.log('Departments response:', response.data)
            if (response.data.success) {
                setFilteredDepartments(response.data.data)
                console.log('Filtered departments set:', response.data.data)
            } else {
                console.error('Failed to fetch departments:', response.data.message)
                setFilteredDepartments([])
            }
        } catch (error) {
            console.error('Error fetching departments by role:', error)
            console.error('Error response:', error.response?.data)
            setFilteredDepartments([])
            showAlertMessage('Failed to load departments for selected role', 'error')
        } finally {
            setDepartmentsLoading(false)
        }
    }


    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)
        setErrors({})

        try {
            const url = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users'
            const method = editingUser ? 'put' : 'post'

            const response = await axios[method](url, formData)

            if (response.data.success) {
                setShowModal(false)
                setEditingUser(null)
                setFormData({
                    full_name: '',
                    email: '',
                    password: '',
                    department_id: '',
                    role_id: ''
                })
                fetchUsers()
            }
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors)
            }
        } finally {
            setSubmitting(false)
        }
    }

    const handleRoleChange = (roleId) => {
        setFormData(prev => ({
            ...prev,
            role_id: roleId,
            department_id: '' // Reset department when role changes
        }))

        if (roleId) {
            fetchDepartmentsByRole(roleId)
        } else {
            setFilteredDepartments([])
            setDepartmentsLoading(false)
        }
    }

    const handleEdit = (user) => {
        setEditingUser(user)
        setFormData({
            full_name: user.full_name,
            email: user.email,
            password: '',
            department_id: user.department_id,
            role_id: user.role_id
        })

        // Fetch departments for the user's role
        if (user.role_id) {
            fetchDepartmentsByRole(user.role_id)
        } else {
            setFilteredDepartments([])
        }

        setShowModal(true)
    }

    const handleDeleteClick = (userId) => {
        const user = users.find(u => u.id === userId)
        setUserToDelete(user)
        setShowDeleteModal(true)
    }

    const handleDeleteClose = () => {
        setShowDeleteModal(false)
        setUserToDelete(null)
        setDeleting(false)
    }

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return

        setDeleting(true)
        try {
            await axios.delete(`/api/admin/users/${userToDelete.id}`)
            handleDeleteClose()
            fetchUsers()
        } catch (error) {
            console.error('Error deleting user:', error)
            showAlertMessage('Error deleting user. Please try again.', 'error')
            setDeleting(false)
        }
    }

    const showAlertMessage = (message, type = 'info') => {
        setAlertMessage(message)
        setAlertType(type)
        setShowAlert(true)
    }


    // Since we're now using server-side pagination and filtering, we use the users directly
    const filteredUsers = users

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'active': return 'bg-green-100 text-green-800'
            case 'inactive': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    // Pagination handlers
    const handlePageChange = (page) => {
        setCurrentPage(page)
    }

    const handlePerPageChange = (newPerPage) => {
        setPerPage(newPerPage)
        setCurrentPage(1) // Reset to first page when changing per page
    }

    // Filter handlers that reset pagination
    const handleSearchChange = (value) => {
        console.log('Search changed to:', value)
        setSearchTerm(value)
        setCurrentPage(1)
    }

    const handleRoleFilterChange = (value) => {
        console.log('Role filter changed to:', value)
        setRoleFilter(value)
        setCurrentPage(1)
    }

    const handleDepartmentFilterChange = (value) => {
        console.log('Department filter changed to:', value)
        setDepartmentFilter(value)
        setCurrentPage(1)
    }

    // Remove full page loading - we'll show skeleton loading instead

    return (
        <AppLayout title="Users" auth={auth}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">User Management</h1>
                        <p className="text-sm lg:text-base text-gray-600 mt-1">Manage system users and their permissions.</p>
                    </div>
                    <div className="flex space-x-3">
                        <Link
                            href="/admin/users/trash"
                            className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                            <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            View Trash
                        </Link>
                    </div>
                </div>

                {/* Filters and Add User */}
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <select
                                value={roleFilter}
                                onChange={(e) => handleRoleFilterChange(e.target.value)}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                                <option value="">All Roles</option>
                                {fixedRoles.map(role => (
                                    <option key={role.id} value={role.id}>{role.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                            <select
                                value={departmentFilter}
                                onChange={(e) => handleDepartmentFilterChange(e.target.value)}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            >
                                <option value="">All Departments</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => {
                                    setEditingUser(null)
                                    setFormData({
                                        full_name: '',
                                        email: '',
                                        password: '',
                                        department_id: '',
                                        role_id: ''
                                    })
                                    setFilteredDepartments([])
                                    setShowModal(true)
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
                            >
                                Add User
                            </button>
                        </div>
                    </div>
                </div>

                {/* Users Table - Desktop */}
                <HorizontalScrollTable className="hidden lg:block bg-white shadow-sm rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Department
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <TableRowSkeleton columns={6} rows={5} />
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {user.full_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {user.role?.name || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {user.department?.name || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor('Active')}`}>
                                                Active
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                                    title="Edit user"
                                                >
                                                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(user.id)}
                                                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                                                    title="Delete user"
                                                >
                                                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </HorizontalScrollTable>

                {/* Users Cards - Mobile */}
                <div className="lg:hidden space-y-4">
                    {loading ? (
                        <CardSkeleton count={5} />
                    ) : (
                        filteredUsers.map((user) => (
                            <div key={user.id} className="bg-white shadow-sm rounded-lg p-4 border border-gray-200">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-medium text-gray-900 truncate">
                                            {user.full_name}
                                        </h3>
                                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                    </div>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor('Active')}`}>
                                        Active
                                    </span>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Role:</span>
                                        <span className="text-gray-900">{user.role?.name || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Department:</span>
                                        <span className="text-gray-900">{user.department?.name || 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-gray-200">
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                            title="Edit user"
                                        >
                                            <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(user.id)}
                                            className="flex-1 inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                                            title="Delete user"
                                        >
                                            <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {!loading && filteredUsers.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-gray-400 text-6xl mb-4">👥</div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                        <p className="text-gray-500">
                            {searchTerm || roleFilter || departmentFilter
                                ? 'Try adjusting your search criteria'
                                : 'Get started by adding your first user'
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

                {/* User Modal */}
                {showModal && (
                    <div className="fixed inset-0 modal-backdrop overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
                        <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
                            <div className="p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-6">
                                    {editingUser ? 'Edit User' : 'Add New User'}
                                </h3>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Full Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.full_name}
                                                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.full_name ? 'border-red-300' : 'border-gray-300'}`}
                                                required
                                            />
                                            {errors.full_name && <p className="mt-1 text-sm text-red-600">{errors.full_name[0]}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email *
                                            </label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.email ? 'border-red-300' : 'border-gray-300'}`}
                                                required
                                            />
                                            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email[0]}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Password {editingUser ? '(leave blank to keep current)' : '*'}
                                            </label>
                                            <input
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.password ? 'border-red-300' : 'border-gray-300'}`}
                                                required={!editingUser}
                                            />
                                            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password[0]}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Role *
                                            </label>
                                            <select
                                                value={formData.role_id}
                                                onChange={(e) => handleRoleChange(e.target.value)}
                                                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.role_id ? 'border-red-300' : 'border-gray-300'}`}
                                                required
                                            >
                                                <option value="">Select Role</option>
                                                {fixedRoles.map(role => (
                                                    <option key={role.id} value={role.id}>{role.name}</option>
                                                ))}
                                            </select>
                                            {errors.role_id && <p className="mt-1 text-sm text-red-600">{errors.role_id[0]}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Department *
                                            </label>
                                            <select
                                                value={formData.department_id}
                                                onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value }))}
                                                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${errors.department_id ? 'border-red-300' : 'border-gray-300'}`}
                                                required
                                                disabled={!formData.role_id || departmentsLoading}
                                            >
                                                <option value="">
                                                    {!formData.role_id
                                                        ? 'Select Role First'
                                                        : departmentsLoading
                                                            ? 'Loading departments...'
                                                            : filteredDepartments.length === 0
                                                                ? 'No departments available for this role'
                                                                : 'Select Department'
                                                    }
                                                </option>
                                                {filteredDepartments.map(dept => (
                                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                                ))}
                                            </select>
                                            {errors.department_id && <p className="mt-1 text-sm text-red-600">{errors.department_id[0]}</p>}
                                            {formData.role_id && filteredDepartments.length === 0 && !departmentsLoading && (
                                                <p className="mt-1 text-sm text-yellow-600">
                                                    No departments are assigned to this role. Please contact an administrator.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                                        >
                                            {submitting ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div
                    className="fixed inset-0 modal-backdrop-danger overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
                    onClick={handleDeleteClose}
                >
                    <div
                        className="relative w-full max-w-md bg-white rounded-lg shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex items-center mb-4">
                                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 text-center mb-4">
                                Delete User
                            </h3>
                            <p className="text-sm text-gray-500 text-center mb-6">
                                Are you sure you want to delete <strong>{userToDelete?.full_name}</strong>?
                            </p>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={handleDeleteClose}
                                    disabled={deleting}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteConfirm}
                                    disabled={deleting}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                                >
                                    {deleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Alert Modal */}
            <AlertModal
                isOpen={showAlert}
                onClose={() => setShowAlert(false)}
                title={alertType === 'success' ? 'Success' : alertType === 'error' ? 'Error' : 'Information'}
                message={alertMessage}
                type={alertType}
                buttonText="OK"
                autoClose={alertType === 'success'}
                autoCloseDelay={3000}
            />
        </AppLayout>
    )
}

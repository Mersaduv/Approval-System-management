import { Head, Link } from '@inertiajs/react'
import AppLayout from '../Layouts/AppLayout'
import { useState, useEffect } from 'react'
import axios from 'axios'
import ConfirmationModal from '../Components/ConfirmationModal'
import AlertModal from '../Components/AlertModal'
import { TableRowSkeleton, CardSkeleton } from '../Components/SkeletonLoader'
import MultiSelectDropdown from '../Components/MultiSelectDropdown'
import HorizontalScrollTable from '../Components/HorizontalScrollTable'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
    useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Sortable Workflow Step Component
function SortableWorkflowStep({ step }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: step.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center justify-between py-2 px-3 bg-gray-50 rounded sortable-item ${isDragging ? 'dragging' : ''}`}
        >
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <div
                        {...attributes}
                        {...listeners}
                        className="drag-handle p-1 text-gray-400 hover:text-gray-600 cursor-grab hover:cursor-grabbing"
                        title="Drag to reorder"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                        {step.order_index + 1}. {step.name}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                        step.step_type === 'approval'
                            ? 'bg-blue-100 text-blue-800'
                            : step.step_type === 'verification'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-purple-100 text-purple-800'
                    }`}>
                        {step.step_type}
                    </span>
                </div>
                {step.description && (
                    <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                        Assignments: {step.assignments_count}
                    </span>
                    {step.timeout_hours && (
                        <span className="text-xs text-gray-500">
                            Timeout: {step.timeout_hours}h
                        </span>
                    )}
                </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${
                step.is_active
                    ? 'text-green-600 bg-green-100'
                    : 'text-red-600 bg-red-100'
            }`}>
                {step.is_active ? 'Active' : 'Inactive'}
            </span>
        </div>
    )
}

export default function Settings({ auth }) {
    const [activeTab, setActiveTab] = useState('general')
    const [departments, setDepartments] = useState([])
    const [roles, setRoles] = useState([])
    const [loading, setLoading] = useState(true)
    const [showDepartmentModal, setShowDepartmentModal] = useState(false)
    const [editingDepartment, setEditingDepartment] = useState(null)
    const [departmentForm, setDepartmentForm] = useState({
        name: '',
        description: '',
        role_ids: []
    })
    const [departmentErrors, setDepartmentErrors] = useState({})
    const [submitting, setSubmitting] = useState(false)
    const [settings, setSettings] = useState({
        emailNotifications: true
    })
    const [settingsLoading, setSettingsLoading] = useState(true)
    const [settingsSaving, setSettingsSaving] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [departmentToDelete, setDepartmentToDelete] = useState(null)
    const [showAlert, setShowAlert] = useState(false)
    const [alertMessage, setAlertMessage] = useState('')
    const [alertType, setAlertType] = useState('info')
    const [deleting, setDeleting] = useState(false)
    const [workflowSteps, setWorkflowSteps] = useState([])
    const [workflowStats, setWorkflowStats] = useState({
        total_steps: 0,
        active_steps: 0,
        inactive_steps: 0,
        steps_by_type: {},
        steps_with_assignments: 0,
        steps_without_assignments: 0
    })
    const [workflowLoading, setWorkflowLoading] = useState(true)
    const [isReordering, setIsReordering] = useState(false)
    const [workflowActiveTab, setWorkflowActiveTab] = useState('regular')
    const [regularWorkflowSteps, setRegularWorkflowSteps] = useState([])
    const [leaveWorkflowSteps, setLeaveWorkflowSteps] = useState([])

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const showAlertMessage = (message, type = 'info') => {
        setAlertMessage(message)
        setAlertType(type)
        setShowAlert(true)
    }

    useEffect(() => {
        fetchDepartments()
        fetchRoles()
        fetchSettings()
        fetchWorkflowData()
    }, [])

    const fetchSettings = async () => {
        try {
            setSettingsLoading(true)
            const response = await axios.get('/api/admin/settings')
            if (response.data.success) {
                const settingsData = response.data.data
                setSettings({
                    emailNotifications: settingsData.email_notifications_enabled || true
                })
            }
        } catch (error) {
            console.error('Error fetching settings:', error)
        } finally {
            setSettingsLoading(false)
        }
    }

    const fetchDepartments = async () => {
        try {
            setLoading(true)
            const response = await axios.get('/api/admin/departments')
            if (response.data.success) {
                setDepartments(response.data.data)
            }
        } catch (error) {
            console.error('Error fetching departments:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchRoles = async () => {
        try {
            const response = await axios.get('/api/admin/roles')
            if (response.data.success) {
                setRoles(response.data.data)
            }
        } catch (error) {
            console.error('Error fetching roles:', error)
        }
    }

    const fetchWorkflowData = async () => {
        try {
            setWorkflowLoading(true)

            // Fetch regular workflow steps
            const regularResponse = await axios.get('/api/admin/workflow-steps?category=regular')
            if (regularResponse.data.success) {
                setRegularWorkflowSteps(regularResponse.data.data)
            }

            // Fetch leave workflow steps
            const leaveResponse = await axios.get('/api/admin/workflow-steps?category=leave')
            if (leaveResponse.data.success) {
                setLeaveWorkflowSteps(leaveResponse.data.data)
            }

            // Fetch workflow statistics
            const statsResponse = await axios.get('/api/admin/workflow-steps/stats/overview')
            if (statsResponse.data.success) {
                setWorkflowStats(statsResponse.data.data)
            }
        } catch (error) {
            console.error('Error fetching workflow data:', error)
            showAlertMessage('Error fetching workflow data: ' + (error.response?.data?.message || error.message), 'error')
        } finally {
            setWorkflowLoading(false)
        }
    }

    const handleDragEnd = async (event) => {
        const { active, over } = event

        if (active.id !== over.id) {
            setIsReordering(true)

            // Determine which steps array to use based on active tab
            const currentSteps = workflowActiveTab === 'regular' ? regularWorkflowSteps : leaveWorkflowSteps
            const setCurrentSteps = workflowActiveTab === 'regular' ? setRegularWorkflowSteps : setLeaveWorkflowSteps

            const oldIndex = currentSteps.findIndex(step => step.id === active.id)
            const newIndex = currentSteps.findIndex(step => step.id === over.id)

            const newOrder = arrayMove(currentSteps, oldIndex, newIndex)

            // Update order_index for each step based on new position
            const updatedOrder = newOrder.map((step, index) => ({
                ...step,
                order_index: index
            }))

            // Update local state immediately for better UX
            setCurrentSteps(updatedOrder)

            try {
                const stepIds = updatedOrder.map(step => parseInt(step.id))
                const response = await axios.post('/api/admin/workflow-steps/reorder', {
                    step_ids: stepIds
                })

                if (!response.data.success) {
                    // Revert on failure
                    setCurrentSteps(currentSteps)
                    showAlertMessage('Error reordering workflow steps', 'error')
                }
            } catch (error) {
                console.error('Error reordering workflow steps:', error)
                // Revert on error
                setCurrentSteps(currentSteps)
                showAlertMessage('Error reordering workflow steps', 'error')
            } finally {
                setIsReordering(false)
            }
        }
    }


    const handleDepartmentSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)
        setDepartmentErrors({})

        try {
            const url = editingDepartment ? `/api/admin/departments/${editingDepartment.id}` : '/api/admin/departments'
            const method = editingDepartment ? 'put' : 'post'

            const response = await axios[method](url, departmentForm)

            if (response.data.success) {
                setShowDepartmentModal(false)
                setEditingDepartment(null)
                setDepartmentForm({ name: '', description: '', role_ids: [] })
                fetchDepartments()
            }
        } catch (error) {
            if (error.response?.data?.errors) {
                setDepartmentErrors(error.response.data.errors)
            }
        } finally {
            setSubmitting(false)
        }
    }

    const handleEditDepartment = (department) => {
        setEditingDepartment(department)
        setDepartmentForm({
            name: department.name,
            description: department.description || '',
            role_ids: department.roles ? department.roles.map(role => role.id) : []
        })
        setShowDepartmentModal(true)
    }


    const handleDeleteDepartment = (departmentId) => {
        const department = departments.find(d => d.id === departmentId)
        setDepartmentToDelete(department)
        setShowDeleteModal(true)
    }


    const handleDeleteConfirm = async () => {
        if (!departmentToDelete) return

        setDeleting(true)
        try {
            await axios.delete(`/api/admin/departments/${departmentToDelete.id}`)
            setShowDeleteModal(false)
            setDepartmentToDelete(null)
            fetchDepartments()
            showAlertMessage('Department deleted successfully.', 'success')
        } catch (error) {
            console.error('Error deleting department:', error)
            const errorMessage = error.response?.data?.message || 'Error deleting department. Please try again.'
            showAlertMessage(errorMessage, 'error')
        } finally {
            setDeleting(false)
        }
    }


    const handleSettingsChange = (e) => {
        const { name, value, type, checked } = e.target
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }


    const handleSettingsSubmit = async (e) => {
        e.preventDefault()

        try {
            setSettingsSaving(true)

            const settingsToSave = [
                { key: 'email_notifications_enabled', value: settings.emailNotifications, type: 'boolean' }
            ]

            const response = await axios.put('/api/admin/settings', {
                settings: settingsToSave
            })

            if (response.data.success) {
                // Settings saved successfully - no need to show message
            } else {
                throw new Error(response.data.message || 'Failed to save settings')
            }
        } catch (error) {
            console.error('Error saving settings:', error)
            showAlertMessage('Error saving settings: ' + (error.response?.data?.message || error.message), 'error')
        } finally {
            setSettingsSaving(false)
        }
    }

    const tabs = [
        { id: 'general', name: 'General Settings', icon: '⚙️' },
        { id: 'departments', name: 'Department Management', icon: '🏢' },
        { id: 'workflow', name: 'Workflow Settings', icon: '🔄' }
    ]

    // Remove full page loading - we'll show skeleton loading instead

    return (
        <AppLayout title="Settings" auth={auth}>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Settings</h1>
                    <p className="text-sm lg:text-base text-gray-600 mt-1">Manage your application settings and preferences.</p>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-8">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <span className="mr-2">{tab.icon}</span>
                                <span className="hidden sm:inline">{tab.name}</span>
                                <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                    {activeTab === 'general' && (
                        <div className="p-4 lg:p-6">
                            <h3 className="text-base lg:text-lg font-medium text-gray-900 mb-4">General Settings</h3>
                            <form onSubmit={handleSettingsSubmit} className="space-y-6 lg:space-y-8">
                                {/* Notifications Section */}
                                <div>
                                    <h4 className="text-md font-medium text-gray-900 mb-4">Notifications</h4>
                                    <div className="space-y-4">
                                        <div className="flex items-center">
                                            <input
                                                id="emailNotifications"
                                                name="emailNotifications"
                                                type="checkbox"
                                                checked={settings.emailNotifications}
                                                onChange={handleSettingsChange}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-900">
                                                Email notifications
                                            </label>
                                        </div>
                                    </div>
                                </div>



                            </form>
                        </div>
                    )}

                    {activeTab === 'departments' && (
                        <div className="p-4 lg:p-6">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                                <h3 className="text-base lg:text-lg font-medium text-gray-900">Department Management</h3>
                                <button
                                    onClick={() => {
                                        setEditingDepartment(null)
                                        setDepartmentForm({ name: '', description: '', role_ids: [] })
                                        setShowDepartmentModal(true)
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-center"
                                >
                                    Add Department
                                </button>
                            </div>

                            {/* Desktop Table */}
                            <HorizontalScrollTable className="hidden lg:block shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Name
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Description
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Role
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Users
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {loading ? (
                                            <TableRowSkeleton columns={5} rows={5} />
                                        ) : (
                                            departments.map((department) => (
                                                <tr key={department.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {department.name}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {department.description || 'No description'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {department.roles && department.roles.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {department.roles.map((role, index) => (
                                                                    <span key={role.id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                        {role.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            'N/A'
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {department.users_count || 0} users
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => handleEditDepartment(department)}
                                                                className="text-blue-600 hover:text-blue-900"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteDepartment(department.id)}
                                                                className={`${
                                                                    department.users_count > 0
                                                                        ? 'text-gray-400 cursor-not-allowed'
                                                                        : 'text-red-600 hover:text-red-900'
                                                                }`}
                                                                disabled={department.users_count > 0}
                                                                title={department.users_count > 0 ? 'Cannot delete department with users' : 'Delete department'}
                                                            >
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

                            {/* Mobile Cards */}
                            <div className="lg:hidden space-y-4">
                                {loading ? (
                                    <CardSkeleton count={5} />
                                ) : (
                                    departments.map((department) => (
                                        <div key={department.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                            <div className="flex items-start justify-between mb-3">
                                                <h3 className="text-sm font-medium text-gray-900">{department.name}</h3>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleEditDepartment(department)}
                                                        className="text-blue-600 hover:text-blue-900 text-xs"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteDepartment(department.id)}
                                                        className={`text-xs ${
                                                            department.users_count > 0
                                                                ? 'text-gray-400 cursor-not-allowed'
                                                                : 'text-red-600 hover:text-red-900'
                                                        }`}
                                                        disabled={department.users_count > 0}
                                                        title={department.users_count > 0 ? 'Cannot delete department with users' : 'Delete department'}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-2 text-sm">
                                                <div>
                                                    <span className="text-gray-500">Description:</span>
                                                    <p className="text-gray-900">{department.description || 'No description'}</p>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Roles:</span>
                                                    <div className="text-gray-900">
                                                        {department.roles && department.roles.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {department.roles.map((role) => (
                                                                    <span key={role.id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                        {role.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            'N/A'
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Users:</span>
                                                    <span className="text-gray-900">{department.users_count || 0} users</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {!loading && departments.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="text-gray-400 text-6xl mb-4">🏢</div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No departments found</h3>
                                    <p className="text-gray-500">Get started by adding your first department</p>
                                </div>
                            )}
                        </div>
                    )}


                </div>

                {/* Department Modal */}
                {showDepartmentModal && (
                    <div className="fixed inset-0 modal-backdrop overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
                        <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
                            <div className="p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-6">
                                    {editingDepartment ? 'Edit Department' : 'Add New Department'}
                                </h3>
                                <form onSubmit={handleDepartmentSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Department Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={departmentForm.name}
                                                onChange={(e) => setDepartmentForm(prev => ({ ...prev, name: e.target.value }))}
                                                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${departmentErrors.name ? 'border-red-300' : 'border-gray-300'}`}
                                                required
                                            />
                                            {departmentErrors.name && <p className="mt-1 text-sm text-red-600">{departmentErrors.name[0]}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Roles *
                                            </label>
                                            <MultiSelectDropdown
                                                options={roles}
                                                selectedValues={departmentForm.role_ids}
                                                onChange={(selectedIds) => setDepartmentForm(prev => ({ ...prev, role_ids: selectedIds }))}
                                                placeholder="Select roles..."
                                                error={departmentErrors.role_ids ? departmentErrors.role_ids[0] : null}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            value={departmentForm.description}
                                            onChange={(e) => setDepartmentForm(prev => ({ ...prev, description: e.target.value }))}
                                            rows={4}
                                            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${departmentErrors.description ? 'border-red-300' : 'border-gray-300'}`}
                                        />
                                        {departmentErrors.description && <p className="mt-1 text-sm text-red-600">{departmentErrors.description[0]}</p>}
                                    </div>
                                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => setShowDepartmentModal(false)}
                                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                                        >
                                            {submitting ? 'Saving...' : (editingDepartment ? 'Update Department' : 'Create Department')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Workflow Settings Tab */}
                {activeTab === 'workflow' && (
                    <div className="p-4 lg:p-6">
                        <h3 className="text-base lg:text-lg font-medium text-gray-900 mb-4">Workflow Management</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Manage approval workflow steps, their order, and assigned approvers.
                        </p>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-900">Current Workflow Steps</h4>
                                        <p className="text-xs text-gray-600 mt-1">Drag and drop to reorder steps</p>
                                    </div>
                                    <button
                                        onClick={fetchWorkflowData}
                                        className="text-blue-600 hover:text-blue-800 text-xs"
                                        disabled={workflowLoading || isReordering}
                                    >
                                        {workflowLoading ? 'Loading...' : isReordering ? 'Reordering...' : ''}
                                    </button>
                                </div>

                                {/* Workflow Steps Tabs */}
                                <div className="mb-4">
                                    <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => setWorkflowActiveTab('regular')}
                                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                                workflowActiveTab === 'regular'
                                                    ? 'bg-white text-blue-600 shadow-sm'
                                                    : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            Regular Requests
                                        </button>
                                        <button
                                            onClick={() => setWorkflowActiveTab('leave')}
                                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                                workflowActiveTab === 'leave'
                                                    ? 'bg-white text-blue-600 shadow-sm'
                                                    : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        >
                                            Leave Requests
                                        </button>
                                    </nav>
                                </div>

                                {workflowLoading ? (
                                    <div className="flex justify-center items-center py-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Regular Requests Tab */}
                                        {workflowActiveTab === 'regular' && (
                                            <div>
                                                {regularWorkflowSteps.length > 0 ? (
                                                    <DndContext
                                                        sensors={sensors}
                                                        collisionDetection={closestCenter}
                                                        onDragEnd={handleDragEnd}
                                                    >
                                                        <SortableContext
                                                            items={regularWorkflowSteps.map(step => step.id)}
                                                            strategy={verticalListSortingStrategy}
                                                        >
                                                            <div className="space-y-2">
                                                                {isReordering && (
                                                                    <div className="flex items-center justify-center py-2">
                                                                        <div className="flex items-center gap-2 text-blue-600">
                                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                                            <span className="text-xs">Reordering steps...</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {regularWorkflowSteps.map((step) => (
                                                                    <SortableWorkflowStep
                                                                        key={step.id}
                                                                        step={step}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </SortableContext>
                                                    </DndContext>
                                                ) : (
                                                    <div className="text-center py-4">
                                                        <p className="text-sm text-gray-500">No regular workflow steps configured</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Leave Requests Tab */}
                                        {workflowActiveTab === 'leave' && (
                                            <div>
                                                {leaveWorkflowSteps.length > 0 ? (
                                                    <DndContext
                                                        sensors={sensors}
                                                        collisionDetection={closestCenter}
                                                        onDragEnd={handleDragEnd}
                                                    >
                                                        <SortableContext
                                                            items={leaveWorkflowSteps.map(step => step.id)}
                                                            strategy={verticalListSortingStrategy}
                                                        >
                                                            <div className="space-y-2">
                                                                {isReordering && (
                                                                    <div className="flex items-center justify-center py-2">
                                                                        <div className="flex items-center gap-2 text-blue-600">
                                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                                            <span className="text-xs">Reordering steps...</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {leaveWorkflowSteps.map((step) => (
                                                                    <SortableWorkflowStep
                                                                        key={step.id}
                                                                        step={step}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </SortableContext>
                                                    </DndContext>
                                                ) : (
                                                    <div className="text-center py-4">
                                                        <p className="text-sm text-gray-500">No leave workflow steps configured</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-900 mb-3">Workflow Statistics</h4>

                                {workflowLoading ? (
                                    <div className="flex justify-center items-center py-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                                                <div className="text-lg font-semibold text-blue-600">{workflowStats.total_steps}</div>
                                                <div className="text-xs text-blue-800">Total Steps</div>
                                            </div>
                                            <div className="text-center p-3 bg-green-50 rounded-lg">
                                                <div className="text-lg font-semibold text-green-600">{workflowStats.active_steps}</div>
                                                <div className="text-xs text-green-800">Active Steps</div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Steps with Assignments:</span>
                                                <span className="font-medium">{workflowStats.steps_with_assignments}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Steps without Assignments:</span>
                                                <span className="font-medium text-orange-600">{workflowStats.steps_without_assignments}</span>
                                            </div>
                                        </div>

                                        {Object.keys(workflowStats.steps_by_type).length > 0 && (
                                            <div className="pt-2 border-t border-gray-200">
                                                <div className="text-xs font-medium text-gray-700 mb-2">Steps by Type:</div>
                                                <div className="space-y-1">
                                                    {Object.entries(workflowStats.steps_by_type).map(([type, count]) => (
                                                        <div key={type} className="flex justify-between text-xs">
                                                            <span className="text-gray-600 capitalize">{type}:</span>
                                                            <span className="font-medium">{count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-3 border-t border-gray-200">
                                            <Link
                                                href="/workflow-settings"
                                                className="block w-full text-center px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                                            >
                                                Manage Workflow Settings
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false)
                    setDepartmentToDelete(null)
                }}
                onConfirm={handleDeleteConfirm}
                title="Delete Department"
                message={
                    departmentToDelete?.users_count > 0
                        ? `Cannot delete "${departmentToDelete?.name}" because it has ${departmentToDelete.users_count} user(s). Please reassign users first.`
                        : `Are you sure you want to delete "${departmentToDelete?.name}"? This action cannot be undone.`
                }
                confirmText={departmentToDelete?.users_count > 0 ? "OK" : "Delete"}
                cancelText="Cancel"
                type={departmentToDelete?.users_count > 0 ? "warning" : "danger"}
                isLoading={deleting}
            />

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

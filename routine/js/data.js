// Data Management Module
const DataManager = {
    // Default columns
    defaultColumns: ['workoutName', 'date', 'exercise', 'targetMuscle', 'sets', 'reps', 'restTime', 'weight', 'progressiveOverload', 'dropset', 'superset', 'superset_name'],
    
    // Get default data structure
    getDefaultData: function() {
        return {
            columns: [
                { id: "workoutName", name: "Workout", type: "text", required: true },
                { id: "date", name: "Date", type: "date", required: true },
                { id: "exercise", name: "Exercise", type: "text", required: true },
                { id: "targetMuscle", name: "Target Muscle", type: "text", required: true },
                { id: "sets", name: "Sets", type: "number", required: true },
                { id: "reps", name: "Reps", type: "text", required: true },
                { id: "restTime", name: "Rest Time (sec)", type: "number", required: false },
                { id: "weight", name: "Weight (kg)", type: "number", required: false },
                { id: "progressiveOverload", name: "Progressive Overload", type: "text", required: false },
                { id: "dropset", name: "Dropset", type: "number", required: false },
                { id: "superset", name: "Superset", type: "number", required: false },
                { id: "superset_name", name: "Superset name", type: "text", required: false }
            ],
            workouts: []
        };
    },
    
    // Load data from localStorage
    loadFromLocalStorage: function() {
        const saved = localStorage.getItem('gymWorkoutData');
        if (saved) {
            return JSON.parse(saved);
        } else {
            return this.getDefaultData();
        }
    },
    
    // Save data to localStorage
    saveToLocalStorage: function(data) {
        localStorage.setItem('gymWorkoutData', JSON.stringify(data));
    }
};

// Global workout data object
let workoutData = DataManager.loadFromLocalStorage();
'use strict';


const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
let deleteWorkout;

//editable form
let editWorkoutForm;
let inputTypeEdit;
let inputDistanceEdit;
let inputDurationEdit;
let inputCadenceEdit;
let inputElevationEdit;
let savedWorkout;

// // delete marker
const menu = document.querySelector('.menu');
const deleteAll = document.querySelector('.deleteAll');

// sorting
const sortDistance = document.querySelector('.sort-distance');
const sortDuration = document.querySelector('.sort-duration');
const sortPaceSpeed = document.querySelector('.sort-pace');
const sortCadence = document.querySelector('.sort-cadence');
const sortElevationGain = document.querySelector('.sort-elevationGain');

//workout class
class Workout{
    date = new Date();
    id = (Date.now()+'').slice(-10); //normally use third party tool to create ID.
    clicks = 0;

    constructor(coords, distance, duration){
        this.coords = coords; // [lat, lng]
        this.distance = distance;
        this.duration = duration;

    }

    // prettier-ignore
    _setDescription(){
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }

    click(){
        this.clicks++;
    }

}

class Running extends Workout {
    type='running';

    constructor(coords, distance, duration, cadence){
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace(){
        // mins/km
        this.pace = this.duration/this.distance;
        return this.pace;

    }



}

class Cycling extends Workout {
    type='cycling';

    constructor(coords, distance, duration, elevationGain){
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed(){
        // km/h
        this.speed = this.distance/ (this.duration/60);
        return this.speed;

    }


}

class App{
    // private instance properties
    #map;
    #mapEvent;
    #workouts = [];
    #mapZoomLevel = 13;
    #markers = [];

    constructor(){
        this._getPosition();

        //get data from local storage
        this._getLocalStorage();

        // need to bind this otherwise it will bind to the DOM that calls the event listener
        // this would be the form but we want the app object
        form.addEventListener('submit', this._newWorkout.bind(this));
            
        // Show cadence for running, elevation for cycling
        inputType.addEventListener('change', this._toggleElevationField)

        // move to nearest workout on click
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this))

        // activate delete all button
        menu.addEventListener('click', this._showMenu.bind(this));
        deleteAll.addEventListener('click', this._deleteAll.bind(this))

        // activate sort buttons
        sortDistance.addEventListener('click', this._sortWorkout.bind(this));
        sortDuration.addEventListener('click', this._sortWorkout.bind(this));
        sortCadence.addEventListener('click', this._sortWorkout.bind(this));
        sortElevationGain.addEventListener('click', this._sortWorkout.bind(this));
        sortPaceSpeed.addEventListener('click', this._sortWorkout.bind(this));

    }

    _getPosition(){
        //geolocation api
        if(navigator.geolocation)
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), 
            function(){
            alert("Could not get your position");
            });
    }


    _loadMap(position){
        const { latitude } = position.coords;
        const { longitude } = position.coords;
        const coords = [latitude, longitude];
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
        
        // L is the Leaflet global variable
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this));
        
        // only load workout markers once map is loaded - this comes from local storage
        this.#workouts.forEach(work =>
            this._renderWorkoutMarker(work)
        );
    };

    _showForm(mapE){
        this.#mapEvent = mapE;
        form.classList.toggle('hidden');
        inputDistance.focus();
    }

    _hideForm(){
        //clear inputs
        inputDistance.value = inputDuration.value =inputElevation.value =inputCadence.value = '';
    
        //hide form immediately to avoid leaving animation
        form.style.display = 'none';
        form.classList.toggle('hidden');

        // wait a second til transition ends, then re-add
        setTimeout(()=> form.style.display = 'grid', 1000)
    }

    _hideEditWorkoutForm(){
        //clear inputs
        inputDistanceEdit.value = inputDurationEdit.value =inputElevationEdit.value =inputCadenceEdit.value = '';
    
        //hide form immediately to avoid leaving animation
        editWorkoutForm.style.display = 'none';
        editWorkoutForm.classList.toggle('hidden');

        // wait a second til transition ends, then re-add
        setTimeout(()=> editWorkoutForm.style.display = 'grid', 1000)
    }


    _toggleElevationField(){
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _toggleElevationField2(){
        inputCadenceEdit.closest('.form__row').classList.toggle('form__row--hidden');
        inputElevationEdit.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e){
        // helper functions
        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp>0);

        //prevent reload of the page
        e.preventDefault();

        // get data from form
        const type = inputType.value;
        const distance = +inputDistance.value; //convert to number
        const duration = +inputDuration.value; //conver to number
        const {lat, lng} = this.#mapEvent.latlng;
        let workout;

        // if activity running, creating running object
        if (type === 'running'){
            const cadence = +inputCadence.value;
            //check data
            if(
                // !Number.isFinite(distance) ||
                // !Number.isFinite(duration) ||
                // !Number.isFinite(cadence)
                !validInputs(distance, duration, cadence) ||
                !allPositive(distance, duration, cadence)
                ) 
                return alert('Inputs have to be positive numbers!')

            workout = new Running([lat,lng],distance,duration,cadence);
        } 

        // if activity cycling, create cycling object
        if (type === 'cycling'){
            const elevation = +inputElevation.value;
            if(
                !validInputs(distance, duration, elevation) ||
                !allPositive(distance, duration)
            ) return alert('Inputs have to be positive numbers!')

            workout = new Cycling([lat,lng],distance,duration,elevation);

        } 

        // add new objct to workout array
        this.#workouts.push(workout);

        // render workout on map as marker
        this._renderWorkoutMarker(workout);

        // render workout on list
        this._renderWorkout(workout);

        //hide form
        this._hideForm();
        
        //set local storage to store workouts
        this._setLocalStorage();
        
    }
    _renderWorkoutMarker(workout){
       // render workout marker using Leaflet library
        const marker = L.marker(workout.coords)
        this.#map.addLayer(marker);
        marker.bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`
        }))
        .setPopupContent(`${workout.type === "running"? "🏃‍♂️": "🚴‍♀️"} ${workout.description}`)
        .openPopup();

        //save markers to delete if required
        this.#markers.push(marker);


    }

    _renderWorkout(workout){
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <div class="workout__heading">
            <h2 class="workout__title">${workout.description}</h2>
            </div><span class="closebtn delete">X</span>
            </div>
            <div class="workout__details">
            <span class="workout__icon">
            ${workout.type === "running"? "🏃‍♂️": "🚴‍♀️"}
            </span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
            </div>
        
        `
        if (workout.type === 'running')
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace.toFixed(1)}</span>
                    <span class="workout__unit">km/min</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">spm</span>
                </div>
            </li>
            `
        if(workout.type==='cycling')
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFixed(1)}</span>
                    <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevationGain}</span>
                    <span class="workout__unit">m</span>
                </div>
            </li>
            `
        form.insertAdjacentHTML('afterend',html);
        document.querySelectorAll('.delete').forEach(x => x.addEventListener('click', this._deleteWorkout.bind(this)));
        

    }   
    _moveToPopup(e){
        // find closest workout element on click
        const workoutEl = e.target.closest('.workout');
        savedWorkout = e.target.closest('.workout');

        // if no workout, do nothing
        if(!workoutEl) return;

        // find workout with the id that we clicked.
        const workout = this.#workouts.find(work => work.id===workoutEl.dataset.id);
        
        //method based on leaflet
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        });

        //replace list display with form
        this._editForm(workoutEl, workout);

        // add event listener to newly created form so it can be submitted
        editWorkoutForm = document.querySelectorAll('.form')[1];
        inputTypeEdit = document.querySelectorAll('.form__input--type')[1];
        inputTypeEdit.addEventListener('change', this._toggleElevationField2)
        inputDistanceEdit = document.querySelectorAll('.form__input--distance')[1];
        inputDurationEdit = document.querySelectorAll('.form__input--duration')[1];
        inputCadenceEdit = document.querySelectorAll('.form__input--cadence')[1];
        inputElevationEdit = document.querySelectorAll('.form__input--elevation')[1];
        editWorkoutForm.addEventListener('submit', this._editWorkout.bind(this))

    }

    

    _editForm(workoutEl, workout){
        let html = `
        <form class="editable-form form" data-id="${workout.id}">
          <div class="form__row">
            <label class="form__label">Type</label>
            <select class="form__input form__input--type">
              <option value="running"${workout.type ==='running'? 'selected':''}>Running</option>
              <option value="cycling" ${workout.type ==='running'? '':'selected'}>Cycling</option>
            </select>
          </div>
          <div class="form__row">
            <label class="form__label">Distance</label>
            <input class="form__input form__input--distance" placeholder="km" value="${workout.distance}" />
          </div>
          <div class="form__row">
            <label class="form__label">Duration</label>
            <input
              class="form__input form__input--duration"
              placeholder="min" value="${workout.duration}"
            />
          </div>
          <div class="form__row ${workout.type ==='running'? '':'form__row--hidden'}">
                <label class="form__label">Cadence</label>
                <input
                class="form__input form__input--cadence"
                placeholder='step/min' value="${workout.type ==='running'? workout.cadence:''}"
                />
                </div>
                <div class="form__row ${workout.type ==='cycling'? '':'form__row--hidden'}">
                    <label class="form__label">Elev Gain</label>
                    <input
                    class="form__input form__input--elevation"
                    placeholder='meters' value="${workout.type ==='cycling'? workout.elevationGain:''}"
                    />
                </div>
                <button class="form__btn">OK</button>
        </form>`
            // show form
           workoutEl.insertAdjacentHTML('afterend',html);
           workoutEl.remove();

        
    }


    _editWorkout(e){
        // helper functions
        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp>0);

        //prevent reload of the page
        e.preventDefault();
        
        // find workout with the id that we clicked.
        const workoutEl = e.target.closest('.form')
        const workout = this.#workouts.find(work => work.id===workoutEl.dataset.id);
      
        // get data from form
        const type = inputTypeEdit.value;
        const distance = +inputDistanceEdit.value; //convert to number
        const duration = +inputDurationEdit.value; //conver to number

        //check data is valid
        // if activity running, creating running object
        let editedWorkout;
        if (type === 'running'){
            const cadence = +inputCadenceEdit.value;
            //check data
            if(
                // !Number.isFinite(distance) ||
                // !Number.isFinite(duration) ||
                // !Number.isFinite(cadence)
                !validInputs(distance, duration, cadence) ||
                !allPositive(distance, duration, cadence)
                ) 
                return alert('Inputs have to be positive numbers! Doh')

            editedWorkout = new Running(workout.coords,distance,duration,cadence);
        } 

        // if activity cycling, create cycling object
        if (type === 'cycling'){
            const elevation = +inputElevationEdit.value;
            if(
                !validInputs(distance, duration, elevation) ||
                !allPositive(distance, duration)
            ) return alert('Inputs have to be positive numbers!')

            editedWorkout = new Cycling(workout.coords,distance,duration,elevation);

        } 

        //remove from map
        const markerToRemove = this.#markers.find(x => x._latlng.lat===workout.coords[0] && x._latlng.lng===workout.coords[1])
        this.#map.removeLayer(markerToRemove);

        // add edited workout objct to workout array
        const workoutIndex = this.#workouts.findIndex(work => work.id===workoutEl.dataset.id);
        this.#workouts = this.#workouts.slice(0,workoutIndex).concat(editedWorkout).concat(this.#workouts.slice(workoutIndex+1))

        

        // // render workout on map as marker
        this._renderWorkoutMarker(editedWorkout);

        // // render workout on list
        this._renderWorkout(editedWorkout);

        //hide form
        this._hideEditWorkoutForm();
        
        //set local storage to store workouts
        this._setLocalStorage();
        
    }


    _setLocalStorage(){
        //browser api - key/value store - 
        // blocking applies, so only works for small amounts of data
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage(){
        const data = JSON.parse(localStorage.getItem('workouts'));

        //if no data do nothing
        if(!data) return;

        this.#workouts = data;
        this.#workouts.forEach(work =>
            this._renderWorkout(work));
    }

    reset(){
        localStorage.removeItem('workouts');
        location.reload();
    }

    _deleteWorkout(e){
        const listItem = e.target.closest('li');
        const listItemID = listItem.dataset.id;
        const workout = this.#workouts.find(work => work.id===listItemID);

        //remove from map
        const markerToRemove = this.#markers.find(x => x._latlng.lat===workout.coords[0] && x._latlng.lng===workout.coords[1])
        this.#map.removeLayer(markerToRemove);

        // remove from list
        e.target.closest('li').remove();

        // remove from workout object
        this.#workouts = this.#workouts.filter(x => x.id != listItemID);

        // remove from local storage
        this._setLocalStorage();
    }

    _showMenu(){
        document.querySelector('.deleteAll').classList.toggle('menu-hidden');
    }

    _deleteAll(){
        // remove from list display
        const lists = document.querySelectorAll('li');
        lists.forEach(x => x.remove());

        // remove from map
        this.#markers.forEach(x => this.#map.removeLayer(x));

        // remove from workouts object
        this.#workouts = [];

        // remove from local storage
        this._setLocalStorage();

    }

    _sortWorkout(e){

        // field field in button which fired event
        const field = e.target.closest('button').classList[0].slice(5,);

        // access icon either arrow up or down to determine sort direction
        const sortDirection = e.target.closest('button').lastChild.classList[1];

        //sort workouts object by field
        // check for undefined to allow for sort by elevationgain and cadence
        if (field === 'pace') {
            this.#workouts.sort(function(a,b){
                return (sortDirection === 'fa-arrow-down' ? 1 : -1)*(a[`${field}`] != undefined ? a[`${field}`] : a['speed']) -  (sortDirection === 'fa-arrow-down' ? 1 : -1)*(b[`${field}`] != undefined ? b[`${field}`] : b['speed'])
            })
        }
        else {
            this.#workouts.sort(function(a,b){
                return (sortDirection === 'fa-arrow-down' ? 1 : -1)*(a[`${field}`] != undefined ? a[`${field}`] : 0) - (sortDirection === 'fa-arrow-down' ? 1 : -1)*(b[`${field}`] != undefined ? b[`${field}`] : 0)
            })

        }

        // remove arrow icon and replace with opposite icon
        e.target.closest('button').lastChild.classList.remove(sortDirection);
        e.target.closest('button').lastChild.classList.add(sortDirection ==='fa-arrow-down' ? 'fa-arrow-up': 'fa-arrow-down');

        //  remove list display
        const lists = document.querySelectorAll('li');
        lists.forEach(x => x.remove());

        // render new workoutlist
        this.#workouts.forEach(work =>
            this._renderWorkout(work));
        
        // update local storage
        this._setLocalStorage();

    }

    
}

let app = new App();

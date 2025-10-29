
import React, { useState, useEffect } from 'react';
import { Doctor, Appointment } from '../types';
import { doctorsData } from '../data/doctors';

interface SchedulerProps {
    appointments: Appointment[];
    setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
    patientName: string;
    initialSpecialty: string;
    onInitialSearchDone: () => void;
}

const DayButton: React.FC<{ day: string; selectedDay: string; setSelectedDay: (day: string) => void; }> = ({ day, selectedDay, setSelectedDay }) => (
    <button
        onClick={() => setSelectedDay(day)}
        className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
            selectedDay === day 
            ? 'bg-blue-500 text-white shadow' 
            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
        }`}
    >
        {day}
    </button>
);

const Scheduler: React.FC<SchedulerProps> = ({ appointments, setAppointments, patientName, initialSpecialty, onInitialSearchDone }) => {
  const [specialty, setSpecialty] = useState(initialSpecialty || '');
  const [location, setLocation] = useState('');
  const [selectedDay, setSelectedDay] = useState('Today');
  const [acceptingNewPatients, setAcceptingNewPatients] = useState(false);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);

  const handleSearch = () => {
    const results = doctorsData.filter(doctor => {
        let isAvailable = false;
        if (selectedDay === 'Today') isAvailable = doctor.isAvailableToday;
        else if (selectedDay === 'Tomorrow') isAvailable = doctor.isAvailableTomorrow;
        else if (selectedDay === 'Day after tomorrow') isAvailable = doctor.isAvailableDayAfter;

        return (
            (specialty === '' || doctor.specialty.toLowerCase().includes(specialty.toLowerCase())) &&
            (location === '' || doctor.location.toLowerCase().includes(location.toLowerCase())) &&
            isAvailable &&
            (!acceptingNewPatients || doctor.isAcceptingNewPatients === true)
        );
    });
    setFilteredDoctors(results);
  };
  
  useEffect(() => {
    // Run search automatically when filters change
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialty, location, selectedDay, acceptingNewPatients]);

  useEffect(() => {
    if (initialSpecialty) {
        setSpecialty(initialSpecialty);
        onInitialSearchDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBook = (doctor: Doctor, time: string, day: string) => {
    const newAppointment: Appointment = {
      id: Date.now(),
      doctor,
      time,
      day,
      patientName,
    };
    setAppointments([...appointments, newAppointment].sort((a,b) => a.id - b.id));
    alert(`Appointment booked with ${doctor.name} for ${day} at ${time}!`);
  };

  const handleCancel = (appointmentId: number) => {
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
        setAppointments(prev => prev.filter(app => app.id !== appointmentId));
    }
  };

  const handleReschedule = (appointmentId: number) => {
    const appointmentToReschedule = appointments.find(app => app.id === appointmentId);
    if (appointmentToReschedule && window.confirm(`Are you sure you want to reschedule your appointment with ${appointmentToReschedule.doctor.name}?`)) {
        setSpecialty(appointmentToReschedule.doctor.specialty);
        setLocation(appointmentToReschedule.doctor.location);
        setAppointments(prev => prev.filter(app => app.id !== appointmentId));
        alert('Your appointment has been cancelled. Please select a new time slot from the available options.');
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg h-full flex flex-col">
      <h2 className="text-xl font-bold text-slate-800 mb-4">Automated Scheduling</h2>
      <div className="space-y-4 mb-6 p-4 bg-slate-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Specialty (e.g., Cardiology)"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
            />
            <input
              type="text"
              placeholder="Location (e.g., Panjim)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900"
            />
            <div className="flex items-center justify-center bg-white p-2 border rounded-md">
                <input type="checkbox" id="acceptingNew" checked={acceptingNewPatients} onChange={e => setAcceptingNewPatients(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <label htmlFor="acceptingNew" className="ml-2 text-sm font-medium text-slate-700">Accepting New Patients</label>
            </div>
        </div>
        <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-slate-700">Availability:</label>
            <DayButton day="Today" selectedDay={selectedDay} setSelectedDay={setSelectedDay} />
            <DayButton day="Tomorrow" selectedDay={selectedDay} setSelectedDay={setSelectedDay} />
            <DayButton day="Day after tomorrow" selectedDay={selectedDay} setSelectedDay={setSelectedDay} />
        </div>
      </div>

      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
        {/* Upcoming Appointments Column */}
        <div className="flex flex-col h-full overflow-hidden">
          <h3 className="text-lg font-semibold mb-2 flex-shrink-0">Upcoming Appointments</h3>
          <div className="flex-grow overflow-y-auto pr-2">
            {appointments.length > 0 ? (
              <ul className="space-y-3">
                {appointments.map(app => (
                  <li key={app.id} className="p-3 bg-green-100 text-green-800 rounded-lg text-sm flex justify-between items-center">
                    <div>
                      <strong>{app.day} at {app.time}</strong>
                      <p>with {app.doctor.name} ({app.doctor.specialty})</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleReschedule(app.id)} className="text-xs bg-blue-200 text-blue-800 hover:bg-blue-300 font-semibold px-2 py-1 rounded-full">
                            Reschedule
                        </button>
                        <button onClick={() => handleCancel(app.id)} className="text-xs bg-red-200 text-red-800 hover:bg-red-300 font-semibold px-2 py-1 rounded-full">
                            Cancel
                        </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-slate-500 text-sm">No upcoming appointments.</p>}
          </div>
        </div>

        {/* Available Doctors Column */}
        <div className="flex flex-col h-full overflow-hidden">
            <h3 className="text-lg font-semibold mb-2 flex-shrink-0">Available Doctors ({filteredDoctors.length})</h3>
            <div className="space-y-4 overflow-y-auto pr-2 flex-grow">
              {filteredDoctors.length > 0 ? filteredDoctors.map(doctor => (
                <div key={doctor.id} className="p-4 border rounded-lg bg-slate-50">
                  <h4 className="font-bold">{doctor.name}</h4>
                  <p className="text-sm text-slate-600">{doctor.specialty} - {doctor.location}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {doctor.availability.map(time => (
                      <button key={time} onClick={() => handleBook(doctor, time, selectedDay)} className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full hover:bg-blue-200">
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )) : <p className="text-slate-500 text-sm">No doctors found. Please adjust your search criteria.</p>}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Scheduler;

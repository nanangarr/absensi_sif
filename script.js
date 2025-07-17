import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js';
import { getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyCbhryt-zN8iElPNXqHdlS3-GFiCTlbxZ4",
    authDomain: "absensi-c9641.firebaseapp.com",
    databaseURL: "https://absensi-c9641-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "absensi-c9641",
    storageBucket: "absensi-c9641.firebasestorage.app",
    messagingSenderId: "1019025501666",
    appId: "1:1019025501666:web:7321be549346b5e3eb9dbb",
    measurementId: "G-P78LFW8JEN"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

let currentLocation = null;

const form = document.getElementById('attendanceForm');
const getLocationBtn = document.getElementById('getLocationBtn');
const locationInfo = document.getElementById('locationInfo');
const submitBtn = document.getElementById('submitBtn');
const loading = document.getElementById('loading');
const alert = document.getElementById('alert');

async function getAddressFromCoords(lat, lon) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`, {
            headers: {
                'User-Agent': 'AbsensiApp/1.0 (attendance-app)'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data && data.address) {
            const address = data.address;
            let formattedAddress = '';

            if (address.house_number) formattedAddress += address.house_number + ' ';
            if (address.road) formattedAddress += address.road + ', ';
            if (address.neighbourhood) formattedAddress += address.neighbourhood + ', ';
            if (address.village) formattedAddress += address.village + ', ';
            if (address.suburb) formattedAddress += address.suburb + ', ';
            if (address.city_district) formattedAddress += address.city_district + ', ';
            if (address.city) formattedAddress += address.city + ', ';
            if (address.state) formattedAddress += address.state + ', ';
            if (address.country) formattedAddress += address.country;

            formattedAddress = formattedAddress.replace(/,\s*$/, '');

            return {
                formatted: formattedAddress || data.display_name,
                details: address,
                full: data.display_name
            };
        }
        return null;
    } catch (error) {
        console.error('Error getting address:', error);
        return null;
    }
}

getLocationBtn.addEventListener('click', function () {
    if (!navigator.geolocation) {
        showLocationError('Geolocation tidak didukung oleh browser ini');
        return;
    }

    this.disabled = true;
    this.textContent = '🔄 Mendapatkan lokasi...';

    navigator.geolocation.getCurrentPosition(
        async function (position) {
            currentLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
            };

            getLocationBtn.textContent = '🔄 Mendapatkan alamat...';

            const address = await getAddressFromCoords(
                currentLocation.latitude,
                currentLocation.longitude
            );

            if (address) {
                currentLocation.address = address;
            } else {
                currentLocation.address = {
                    formatted: 'Alamat tidak dapat ditemukan',
                    details: null,
                    full: null
                };
            }

            showLocationSuccess();
            getLocationBtn.disabled = false;
            getLocationBtn.textContent = '✅ Lokasi Didapat';
        },
        function (error) {
            let errorMessage;
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Izin lokasi ditolak';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Informasi lokasi tidak tersedia';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Timeout mendapatkan lokasi';
                    break;
                default:
                    errorMessage = 'Error tidak diketahui';
            }
            showLocationError(errorMessage);
            getLocationBtn.disabled = false;
            getLocationBtn.textContent = '📍 Dapatkan Lokasi';
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
});

form.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!validateForm()) return;

    showLoading(true);

    try {
        const formData = getFormData();
        formData.location = currentLocation;
        formData.timestamp = serverTimestamp();
        formData.submittedAt = new Date().toISOString();

        const docRef = await addDoc(collection(db, 'attendance'), formData);

        showAlert('success', 'Absensi berhasil dikirim! ID: ' + docRef.id);
        form.reset();
        resetForm();
    } catch (error) {
        console.error('Error:', error);
        showAlert('error', 'Terjadi kesalahan: ' + error.message);
    } finally {
        showLoading(false);
    }
});

function validateForm() {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const institution = document.getElementById('institution').value.trim();
    const speakers = document.querySelectorAll('input[name="speakers"]:checked');

    if (!name || !email || !institution) {
        showAlert('error', 'Semua field wajib harus diisi');
        return false;
    }

    if (speakers.length === 0) {
        showAlert('error', 'Pilih minimal satu narasumber');
        return false;
    }

    if (!currentLocation) {
        showAlert('error', 'Lokasi diperlukan');
        return false;
    }

    return true;
}

function getFormData() {
    const speakers = Array.from(document.querySelectorAll('input[name="speakers"]:checked'))
        .map(cb => cb.value);

    return {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        institution: document.getElementById('institution').value.trim(),
        speakers: speakers
    };
}

function resetForm() {
    currentLocation = null;
    locationInfo.innerHTML = '';
    getLocationBtn.textContent = '📍 Dapatkan Lokasi';
    getLocationBtn.disabled = false;
}

function showAlert(type, message) {
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.display = 'block';

    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
    submitBtn.disabled = show;
}

function showLocationSuccess() {
    let locationHTML = `
            <div class="location-status location-success">
                ✅ Lokasi berhasil didapat
            </div>
            <div style="margin-top: 10px; font-size: 14px;">
                📍 Lat: ${currentLocation.latitude.toFixed(6)}, Long: ${currentLocation.longitude.toFixed(6)}
                <br>📏 Akurasi: ${currentLocation.accuracy.toFixed(0)} meter
                    `;

    if (currentLocation.address) {
        locationHTML += `
                    <br><br>🏠 <strong>Alamat:</strong>
                    <div class="address-box">
                        ${currentLocation.address.formatted}
                    </div>
                `;
    }

    locationHTML += `</div>`;
    locationInfo.innerHTML = locationHTML;
}

function showLocationError(message) {
    locationInfo.innerHTML = `
                <div class="location-status location-error">
                    ❌ ${message}
                </div>
            `;
}
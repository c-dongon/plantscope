import React, { useState, useEffect } from 'react';
import { View, TextInput, Alert, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth, firestore, storage } from './firebase.client';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';

const FriendsScreen = ({ navigation }) => {
    const [emailOrUsername, setEmailOrUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
            syncLocalPlantsToFirebase(user.uid);
            navigation.navigate('FriendsList', { userId: user.uid });
        }
        });

        return () => unsubscribe(); 
    }, [navigation]);

    const syncLocalPlantsToFirebase = async (userId) => {
        try {
            const storedCollection = await AsyncStorage.getItem('plantCollection');
            const localPlants = storedCollection ? JSON.parse(storedCollection) : [];
    
            if (localPlants.length > 0) {
                const plantsCollectionRef = collection(firestore, 'users', userId, 'plants');
                const plantsSnapshot = await getDocs(plantsCollectionRef);
    
                const firebasePlants = plantsSnapshot.docs.map(doc => doc.data());
    
                const missingPlants = localPlants.filter(localPlant => 
                    !firebasePlants.some(firebasePlant => firebasePlant.plantInfo.species.scientificName === localPlant.plantInfo.species.scientificName)
                );
    
                for (const plant of missingPlants) {
                    try {
                        let imageUrl = plant.imageUri;
    
                        if (plant.imageUri && !plant.imageUri.startsWith('https://')) {
                            const imageRef = ref(storage, `plants/${userId}/${Date.now()}_${plant.plantInfo.species.scientificName}.jpg`);
                            
                            const response = await fetch(plant.imageUri);
                            const blob = await response.blob();
                            
                            const uploadResult = await uploadBytes(imageRef, blob);
                            
                            imageUrl = await getDownloadURL(uploadResult.ref);
                        }
    
                        const plantRef = doc(plantsCollectionRef);
                        await setDoc(plantRef, { ...plant, imageUri: imageUrl, docId: plantRef.id });
    
                    } catch (syncError) {
                        console.error('Error syncing plant to Firebase:', syncError);
                    }
                }
                console.log('Local plants synced to Firebase');
            }
        } catch (error) {
            console.error('Error syncing local plants to Firebase:', error);
        }
    };
    
    const handleSignIn = async () => {
        setLoading(true);
        try {
        let userEmail = emailOrUsername;

        if (!emailOrUsername.includes('@')) {
            const usersRef = collection(firestore, 'users');
            const q = query(usersRef, where('username', '==', emailOrUsername));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            userEmail = userData.email;
            } else {
            throw new Error('Username does not exist.');
            }
        }

        await signInWithEmailAndPassword(auth, userEmail, password);
        navigation.navigate('FriendsList', { userId: auth.currentUser.uid });
        } catch (error) {
        Alert.alert('Sign In Failed', error.message);
        } finally {
        setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
        <Text style={styles.title}>Sign In</Text>
        <Text style={styles.text}>To add friends and see their collections!</Text>
        <TextInput
            style={styles.input}
            placeholder="Username or Email"
            value={emailOrUsername}
            onChangeText={setEmailOrUsername}
            autoCapitalize="none"
            placeholderTextColor="#888" 

        />
        <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholderTextColor="#888" 
        />
        {loading ? (
            <ActivityIndicator size="large" color="#74cc60" />
        ) : (
            <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
		        <Icon name="log-in-outline" size={24} color="white" />
                <Text style={styles.signInButtonText}>Sign in</Text>
            </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.registerButton} onPress={() => navigation.navigate('RegisterScreen')}>
		<Icon name="create-outline" size={24} color="white" />
            <Text style={styles.registerButtonText}>Register</Text>
        </TouchableOpacity>
        </View>
    );
    };

    const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
        textAlign: 'center',
        color: '#333',
    },
    text: {
        fontSize: 17,
        textAlign: 'center',
        marginBottom: 15,
    },
    input: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        marginBottom: 10,
        padding: 10,
        borderRadius: 5,
    },
    signInButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#5bc443',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: 'green',
        shadowColor: '#000',
        shadowOffset: { height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 2,
        marginBottom: 10,
    },
    signInButtonText: {
        color: 'white',
        marginLeft: 5,
        fontSize: 16,   
    },
    registerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#409e2b',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#246915',
        shadowColor: '#000',
        shadowOffset: { height: 1 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        elevation: 2,
    },
    registerButtonText: {
        color: 'white',
        marginLeft: 5,
        fontSize: 16,   
    },
});

export default FriendsScreen;

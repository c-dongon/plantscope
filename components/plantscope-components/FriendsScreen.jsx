import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, Alert, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth, firestore } from './firebase.client';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
                        const plantRef = doc(plantsCollectionRef);
                        await setDoc(plantRef, { ...plant, docId: plantRef.id });
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
        <TextInput
            style={styles.input}
            placeholder="Username or Email"
            value={emailOrUsername}
            onChangeText={setEmailOrUsername}
            autoCapitalize="none"
        />
        <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
        />
        {loading ? (
            <ActivityIndicator size="large" color="#74cc60" />
        ) : (
            <Button title="Sign In" onPress={handleSignIn} />
        )}
        <TouchableOpacity onPress={() => navigation.navigate('RegisterScreen')}>
            <Text style={styles.registerText}>Register</Text>
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
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    input: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        marginBottom: 10,
        padding: 10,
        borderRadius: 5,
    },
    registerText: {
        marginTop: 20,
        textAlign: 'center',
        color: 'blue',
    },
});

export default FriendsScreen;

import React, { useState } from 'react';
import { View, TextInput, Button, Alert, ActivityIndicator, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, firestore } from './firebase.client'; 
import { doc, setDoc } from 'firebase/firestore'; 
import Icon from 'react-native-vector-icons/Ionicons';

const RegisterScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        try {
            setLoading(true);
            
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            await setDoc(doc(firestore, 'users', uid), {
                username: username,
                email: email,
            });

            Alert.alert('Success', 'Registration complete! You can now log in.');
            navigation.navigate('FriendsScreen'); 
        } catch (error) {
            Alert.alert('Registration Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBackToSignIn = () => {
        navigation.navigate('FriendsScreen');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.createAccountText}>Create an account</Text>
            <TextInput
                style={styles.input}
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholderTextColor="#888" 
            />
            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
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
                <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
		            <Icon name="log-in-outline" size={24} color="white" />
                    <Text style={styles.registerButtonText}>Register</Text>
                </TouchableOpacity>
            )}
            
            <TouchableOpacity onPress={handleBackToSignIn} style={styles.backButton}>
                <Icon name="chevron-back" size={20} color="#74cc60" />
                <Text style={styles.backButtonText}>Back to Sign In</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { 
        padding: 20,
        flex: 1,
        justifyContent: 'center',
    },
    input: { 
        height: 40, 
        borderColor: '#ccc', 
        borderWidth: 1, 
        marginBottom: 10, 
        padding: 10, 
        borderRadius: 5,
    },
    backButton: {
        justifyContent: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
    },
    backButtonText: {
        color: '#74cc60',
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
    createAccountText: {
        justifyContent: 'center',
        flexDirection: 'row',
        alignSelf: 'center',
		fontWeight: 'bold',
		fontSize: 24,
        margin: 10,
    }
});

export default RegisterScreen;

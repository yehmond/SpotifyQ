from django import forms


class PINForm(forms.Form):
    pin = forms.CharField(max_length=64,widget=forms.TextInput(attrs={'placeholder': 'PIN'}))
